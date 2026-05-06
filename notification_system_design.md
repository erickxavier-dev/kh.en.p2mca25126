# Stage 1

## Overview
This document outlines the REST API design, contract, and real-time mechanism for the Campus Notification Platform. The platform provides students with real-time updates regarding Placements, Events, and Results.

## Core Actions Supported
1. **Fetch Notifications**: Retrieve a list of active notifications, filterable by category (Placements, Events, Results).
2. **Mark as Read**: Mark a specific notification as read by the user.
3. **Mark All as Read**: Mark all pending notifications as read in a single action.
4. **Real-time Subscription**: Establish a connection to receive notifications instantaneously as they are published.

---

## REST API Design & Contracts

### Common Headers
For all endpoints below, the following headers are required (assuming users are pre-authorized as per the guidelines):
- `Authorization: Bearer <user_token>`
- `Content-Type: application/json`
- `Accept: application/json`

### 1. Fetch Notifications
Retrieves notifications for the logged-in user.

- **Endpoint**: `GET /api/v1/notifications`
- **Query Parameters**:
  - `category` (optional): Filter by `placements`, `events`, or `results`.
  - `page` (optional): Page number (default: 1).
  - `limit` (optional): Items per page (default: 20).
  - `unreadOnly` (optional): Boolean, if true, returns only unread notifications.

**Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_12345",
        "category": "placements",
        "title": "Tech Corp Campus Drive",
        "message": "Tech Corp is visiting the campus on June 1st for Software Engineer roles.",
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

### 2. Mark Notification as Read
Marks a specific notification as read for the user.

- **Endpoint**: `PATCH /api/v1/notifications/:id/read`

**Request Body**
*(Empty body, the action is defined by the URL semantic)*

**Response (200 OK)**
```json
{
  "success": true,
  "message": "Notification marked as read successfully.",
  "data": {
    "id": "notif_12345",
    "isRead": true,
    "readAt": "2026-05-06T10:05:00Z"
  }
}
```

### 3. Mark All Notifications as Read
Marks all unread notifications as read for the logged-in user.

- **Endpoint**: `POST /api/v1/notifications/read-all`

**Request Body**
*(Empty body)*

**Response (200 OK)**
```json
{
  "success": true,
  "message": "All notifications marked as read.",
  "data": {
    "updatedCount": 14
  }
}
```

---

## Real-Time Notification Mechanism

To support real-time delivery of updates without requiring the frontend to continuously poll the server, we will utilize **Server-Sent Events (SSE)**. 

While WebSockets provide bi-directional communication, SSE is lightweight, natively supported by HTTP/1.1 and HTTP/2, and perfectly suited for a unidirectional event stream (Server -> Client) which matches the requirements of a notification system.

### SSE Connection Design

- **Endpoint**: `GET /api/v1/notifications/stream`
- **Headers Required**:
  - `Authorization: Bearer <user_token>`
  - `Accept: text/event-stream`

### Client-Side Implementation (React/JavaScript)
The frontend developer can consume the stream using the native `EventSource` API:

```javascript
const eventSource = new EventSource('/api/v1/notifications/stream');

// Listen for placement events
eventSource.addEventListener('placements', (event) => {
    const data = JSON.parse(event.data);
    displayNotification(data);
});

// Listen for generic updates
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateNotificationBadge(data);
};

// Handle connection errors
eventSource.onerror = (error) => {
    console.error("SSE Connection lost. Reconnecting...", error);
};
```

### Payload Structure over SSE
When an event occurs on the backend, the SSE stream will push a payload structured identically to the `Fetch Notifications` object, allowing the frontend to instantly append it to the application state.

---

## Stage 2

### Recommended Persistent Storage
**MongoDB (NoSQL Document Store)** is the highly recommended persistent storage for this notification platform.

**Explanation for Choice:**
1. **Schema Flexibility**: Different notification categories require completely different metadata structures (e.g., Placements require `companyId` and `role`, Events require `location` and `time`, Results require `semester` and `status`). MongoDB's document model handles this heterogeneous data naturally without requiring complex joins or sparse columns.
2. **High Write Throughput**: Notification systems generate massive amounts of write operations (e.g., marking notifications as read for thousands of students). MongoDB scales horizontally and handles high-volume writes exceptionally well.
3. **Data Lifecycle Management**: MongoDB has native TTL (Time-To-Live) indexes, making it trivial to automatically delete outdated notifications after a certain period, preventing database bloat.

### Database Schema
We will use a `notifications` collection with the following document structure:

```json
{
  "_id": ObjectId("64a7b9c9f1a2b3c4d5e6f7g8"),
  "userId": ObjectId("user_12345"),
  "category": "placements", 
  "title": "Tech Corp Campus Drive",
  "message": "Tech Corp is visiting the campus on June 1st.",
  "isRead": false,
  "createdAt": ISODate("2026-05-06T10:00:00Z"),
  "readAt": null,
  "metadata": {
    "companyId": "comp_89",
    "role": "Software Engineer"
  }
}
```

### Problems Arising from Data Volume Increase
As the system scales and data volume increases over time, the following problems could arise:
1. **Slow Read Queries**: Fetching the latest unread notifications for a user will become slow if the collection grows to millions of documents and isn't properly indexed.
2. **High Write Contention**: Broadcasting a campus-wide event to 10,000 students requires inserting 10,000 documents simultaneously, which could cause a major processing bottleneck.
3. **Storage Costs**: Retaining years of old, read notifications will unnecessarily consume disk space and memory cache.

### Solutions to Scaling Problems
1. **TTL Indexes for Archival**: Implement a TTL index on `createdAt` (e.g., expire after 90 days) to automatically drop old notifications and maintain a constant storage footprint.
2. **Fan-out on Read (for Broadcasts)**: Instead of creating 10,000 individual documents for a campus-wide broadcast, store a single "global" notification document. When a user requests their feed, merge their individual notifications with active global notifications on the fly.
3. **Compound Indexing**: Ensure a compound index exists on `{ userId: 1, isRead: 1, createdAt: -1 }` to guarantee O(1) read performance when fetching a specific user's unread inbox.
4. **Caching**: Utilize Redis to cache the "unread notification count" for active users, eliminating the need to run an aggregate count query on MongoDB every time the user opens the application.

### Queries Based on REST APIs (Stage 1)

**1. Fetch Notifications (GET /api/v1/notifications)**
```javascript
// Query for fetching unread placement notifications for a specific user
db.notifications.find({ 
  userId: ObjectId("user_12345"), 
  category: "placements",
  isRead: false 
})
.sort({ createdAt: -1 })
.skip(0)
.limit(20);
```

**2. Mark Notification as Read (PATCH /api/v1/notifications/:id/read)**
```javascript
db.notifications.updateOne(
  { 
    _id: ObjectId("64a7b9c9f1a2b3c4d5e6f7g8"), 
    userId: ObjectId("user_12345") 
  },
  { 
    $set: { 
      isRead: true, 
      readAt: new Date() 
    } 
  }
);
```

**3. Mark All Notifications as Read (POST /api/v1/notifications/read-all)**
```javascript
db.notifications.updateMany(
  { 
    userId: ObjectId("user_12345"), 
    isRead: false 
  },
  { 
    $set: { 
      isRead: true, 
      readAt: new Date() 
    } 
  }
);
```

---

## Stage 3

### Query Accuracy and Performance

**Is this query accurate?**
Yes, the query is functionally accurate. It correctly retrieves all unread notifications for the specific student (`studentID = 1042` and `isRead = false`) and sorts them chronologically by their creation time ascending.

**Why is this slow?**
The query is slow because the database lacks an optimal index for this specific access pattern. With 5,000,000 records in the `notifications` table, filtering by `studentID` and `isRead` and then sorting by `createdAt` forces the database engine to perform a full table scan (or a large unoptimized index scan followed by an expensive in-memory sort). Scanning millions of rows takes $O(N)$ time complexity and consumes significant CPU and I/O resources, causing the performance bottleneck.

### Proposed Changes and Computation Cost

**What would you change?**
I would add a **composite B-Tree index** on the exact columns used for filtering and sorting. Specifically, the index should be on `(studentID, isRead, createdAt)`.

**Likely computation cost:**
With the composite index `(studentID, isRead, createdAt)`, the database can traverse the B-Tree directly to the subset of rows matching `studentID = 1042` AND `isRead = false`. Because `createdAt` is the third key in the index, the retrieved rows are natively returned in sorted order, completely eliminating the need for an additional sort step. The computation cost (time complexity) reduces from $O(N \log N)$ to $O(\log N + K)$, where N is the total number of notifications and K is the number of unread notifications for that student. The query will execute in milliseconds.

### Advice on Indexing Every Column

**Is this advice effective? Why/Why not?**
No, adding indexes on every column is **highly ineffective** and is a well-known database anti-pattern. 

**Why not?**
1. **Severe Write Performance Penalty:** Every time a new notification is inserted, updated, or deleted, the database must synchronously update *every single index*. In a high-throughput notification system, this will cripple write performance.
2. **Massive Storage Overhead:** Indexes consume disk space and RAM. Indexing every column will exponentially bloat the database size, leading to higher infrastructure costs and pushing valuable data out of the in-memory cache.
3. **Query Optimizer Confusion:** Having an excessive number of indexes can confuse the database's query optimizer, causing it to occasionally choose suboptimal execution plans.

### SQL Query: Placement Notifications in the Last 7 Days

```sql
SELECT DISTINCT studentID 
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL 7 DAY;
```
*(Note: Date subtraction syntax may vary slightly depending on the SQL dialect, e.g., PostgreSQL uses `CURRENT_DATE - INTERVAL '7 days'`)*
