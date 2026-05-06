# Stage 1

## Overview

This document covers the REST API design and real-time notification strategy for the Campus Notification Platform. Students on this platform get notified about Placements, Events, and Results when they are logged in.

## What the Platform Needs to Support

There are four main things users need to do:
1. Get their list of notifications (filtered by category if needed)
2. Mark a specific notification as read
3. Clear all unread notifications in one shot
4. Receive new notifications in real time without refreshing the page

---

## REST API Endpoints

### Headers Required on Every Request

```
Authorization: Bearer <user_token>
Content-Type: application/json
Accept: application/json
```

---

### 1. GET /api/v1/notifications — Fetch Notifications

Returns the notification list for the currently logged-in user.

**Query Parameters (all optional):**
- `category` — filter by `placements`, `events`, or `results`
- `page` — defaults to 1
- `limit` — defaults to 20 per page
- `unreadOnly` — pass `true` to get only unread items

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_12345",
        "category": "placements",
        "title": "Tech Corp Campus Drive",
        "message": "Tech Corp is visiting on June 1st for Software Engineer roles.",
        "isRead": false,
        "createdAt": "2026-05-06T10:00:00Z",
        "metadata": {
          "companyId": "comp_89",
          "role": "Software Engineer"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100
    }
  }
}
```

**Error Response — 401 Unauthorized**
```json
{
  "success": false,
  "error": "Token missing or expired"
}
```

---

### 2. PATCH /api/v1/notifications/:id/read — Mark One as Read

Marks a single notification as read. The action is implicit from the URL so no request body is needed.

**Response — 200 OK**
```json
{
  "success": true,
  "message": "Marked as read.",
  "data": {
    "id": "notif_12345",
    "isRead": true,
    "readAt": "2026-05-06T10:05:00Z"
  }
}
```

**Error Response — 404 Not Found**
```json
{
  "success": false,
  "error": "Notification not found"
}
```

---

### 3. POST /api/v1/notifications/read-all — Clear All Unread

Marks every unread notification as read for the current user.

**Request Body:** none

**Response — 200 OK**
```json
{
  "success": true,
  "message": "All notifications cleared.",
  "data": {
    "updatedCount": 14
  }
}
```

---

## Real-Time Notifications — SSE

For real-time delivery, the platform uses **Server-Sent Events (SSE)**. The reason SSE was picked over WebSockets is that notification delivery is one-directional — the server pushes to the client, and the client never needs to send data back over the same connection. SSE handles this cleanly and works over standard HTTP without extra infrastructure.

### Stream Endpoint

```
GET /api/v1/notifications/stream
Headers:
  Authorization: Bearer <user_token>
  Accept: text/event-stream
```

### Client Usage Example

```javascript
const stream = new EventSource('/api/v1/notifications/stream');

stream.addEventListener('placements', (e) => {
    const notification = JSON.parse(e.data);
    showToast(notification.title);
});

stream.onmessage = (e) => {
    const data = JSON.parse(e.data);
    updateBadgeCount(data.unreadCount);
};

stream.onerror = () => {
    console.warn('Stream disconnected, will retry automatically.');
};
```

### What Each SSE Event Looks Like

```
event: placements
data: {"id":"notif_99","title":"Google Drive 2026","message":"Google is hiring for SDE roles.","createdAt":"2026-05-06T12:00:00Z"}

event: results
data: {"id":"notif_100","title":"Sem 5 Results Out","message":"Check your portal.","createdAt":"2026-05-06T12:05:00Z"}
```

---

## Stage 2

### Why MongoDB

MongoDB is the right fit for this platform. Notifications for placements, events, and results each have different fields — a placement notification needs `companyId` and `role`, while a result notification needs `semester` and `status`. A relational table would either waste columns or need complex joins. MongoDB handles each notification type as its own document shape naturally.

Beyond schema flexibility, two other things matter: MongoDB handles high write loads well (broadcasting to thousands of students), and it has built-in TTL indexes to automatically expire old notifications — no cron job needed.

### Document Structure

```json
{
  "_id": "ObjectId(64a7b9c9f1a2b3c4d5e6f7g8)",
  "userId": "ObjectId(user_12345)",
  "category": "placements",
  "title": "Tech Corp Campus Drive",
  "message": "Tech Corp is visiting on June 1st.",
  "isRead": false,
  "createdAt": "2026-05-06T10:00:00Z",
  "readAt": null,
  "metadata": {
    "companyId": "comp_89",
    "role": "Software Engineer"
  }
}
```

### Problems That Will Show Up at Scale

1. **Slow reads** — without indexes, fetching unread notifications for a user in a 10M document collection will be a full scan.
2. **Write spikes** — sending a campus-wide notification creates thousands of inserts at once, which can block the database.
3. **Storage bloat** — old read notifications pile up over time and eat memory cache space.

### Fixes for Each Problem

1. **TTL index on `createdAt`** — auto-deletes documents older than 90 days. Zero application code needed.
2. **Fan-out on read for broadcasts** — store one global notification document instead of 10,000 identical copies. Merge it into the user feed at query time.
3. **Compound index on `{ userId, isRead, createdAt }`** — makes per-user inbox queries fast regardless of collection size.
4. **Redis cache for unread count** — avoids running a count aggregate on MongoDB every time the notification badge re-renders.

### MongoDB Queries for Each API

**Fetch unread placements for a user:**
```javascript
db.notifications.find({
  userId: ObjectId("user_12345"),
  category: "placements",
  isRead: false
})
.sort({ createdAt: -1 })
.skip(0)
.limit(20);
```

**Mark one notification as read:**
```javascript
db.notifications.updateOne(
  { _id: ObjectId("64a7b9c9f1a2b3c4d5e6f7g8"), userId: ObjectId("user_12345") },
  { $set: { isRead: true, readAt: new Date() } }
);
```

**Mark all notifications as read:**
```javascript
db.notifications.updateMany(
  { userId: ObjectId("user_12345"), isRead: false },
  { $set: { isRead: true, readAt: new Date() } }
);
```

---

## Stage 3

### Is the Query Accurate?

Yes, the query is correct in what it's trying to do. It fetches unread notifications for `studentID = 1042`, filtered by `isRead = false`, and orders them by `createdAt ASC`. The logic is fine.

### Why Is It Slow?

With 5 million records and no suitable index, the database has to scan through every row to find the ones matching `studentID = 1042` and `isRead = false`. That's a full table scan. After finding those rows, it then has to sort them in memory by `createdAt`. Both steps are expensive. The more data grows, the worse it gets — linearly.

### What Would I Change?

Add a composite index on `(studentID, isRead, createdAt)`. That's it. Here's why the order matters:

- `studentID` first — narrows the result set immediately to just that student's rows
- `isRead` second — within that student's rows, keeps only the unread ones
- `createdAt` third — the remaining rows come out pre-sorted, so the database skips the sort step entirely

**Before the index:** the database scans all 5M rows → then sorts → response is slow (O(N log N))  
**After the index:** the database tree-walks directly to the matching rows → already sorted → response in milliseconds (O(log N + K))

### Is Indexing Every Column a Good Idea?

No. This is a common mistake. Here's the problem: every index needs to be updated whenever a row is inserted, modified, or deleted. In a notification system where thousands of records are written per minute, updating 30 indexes on every insert will kill write throughput. On top of that, indexes consume memory. A large number of indexes can push actual data out of the memory cache, making reads slower too. The query optimizer may also get confused and pick a worse plan when too many indexes exist.

The right approach is to index based on actual query patterns, not defensively across every column.

### SQL Query: Students With Placement Notifications in Last 7 Days

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL 7 DAY;
```

*(PostgreSQL: use `CURRENT_TIMESTAMP - INTERVAL '7 days'` instead)*

---

## Stage 4

### The Problem

Notifications are fetched fresh from the database on every page load, for every student. Once the student count grows, this pattern hammers the database with redundant reads. Most of the time, a student's notification list hasn't changed since they last checked. The database is doing the same work repeatedly for no benefit.

### What I Would Do

There are a few strategies here, and they work best in combination:

---

**1. Cache Notifications in Redis**

When a student loads their notification feed, the result gets stored in Redis with a short TTL (say, 60 seconds). The next request — or any request within that window — hits Redis, not MongoDB. The database load drops sharply.

When a new notification arrives or a student marks something as read, we invalidate that student's cache key. The next fetch rebuilds it from the database and caches again.

*Tradeoff:* There's a brief window where a student might see slightly stale data (up to the TTL duration). For a campus notification system, 60 seconds of lag is acceptable. If we needed stricter freshness, we'd either shorten the TTL or invalidate the cache on every write event.

---

**2. Unread Count as a Separate Cached Value**

The notification badge (showing "3 unread") is fetched much more frequently than the full notification list. Instead of running `COUNT(*)` on MongoDB each time, store just the unread count per user in Redis. Update it directly when a notification is created (+1) or marked as read (-1). This makes badge rendering free in terms of database cost.

*Tradeoff:* If Redis crashes and restarts without persistence, the counts can drift out of sync. The fix is to rebuild the count from MongoDB on cache miss — which we'd do anyway.

---

**3. Fan-out on Read for Broadcast Notifications**

Right now, broadcasting an announcement to 10,000 students likely creates 10,000 separate documents in MongoDB. When each student loads their feed, they're each getting their own copy fetched individually. Instead, store one global notification document. During a student's feed query, merge their personal notifications with active global ones in the application layer.

*Tradeoff:* The merge logic adds a small amount of application complexity, but it eliminates the write storm on broadcast and cuts storage significantly.

---

**4. Pagination — Don't Fetch Everything**

Fetching all of a student's notifications in one query is wasteful. The API already supports `limit` and `page` parameters (defined in Stage 1). If the frontend actually uses them — loading 20 at a time and requesting more only when the user scrolls — the per-request cost drops dramatically.

*Tradeoff:* Requires the frontend to implement scroll-based or button-triggered pagination instead of dumping everything at once.

---

### Summary of Tradeoffs

| Strategy | Benefit | Tradeoff |
|---|---|---|
| Redis cache | DB queries drop significantly | Brief data staleness (1 min) |
| Cached unread count | Badge renders without DB hit | Slight drift risk on crash |
| Fan-out on read | Eliminates broadcast write storm | Merge logic in app layer |
| Proper pagination | Smaller, faster queries | Frontend must implement paging |

The first two strategies give the biggest immediate gain and are worth implementing regardless of the others.

