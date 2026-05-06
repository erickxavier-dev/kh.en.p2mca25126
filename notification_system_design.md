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
