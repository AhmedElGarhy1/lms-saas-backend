# Frontend Notification API Documentation

This document provides comprehensive information about the notification API endpoints for frontend integration. All endpoints require JWT authentication via Bearer token in the Authorization header.

## Base URL

All notification endpoints are prefixed with `/notifications`

---

## In-App Notifications API

Base path: `/notifications/in-app`

### 1. Get User Notifications (Paginated)

**Endpoint:** `GET /notifications/in-app`

**Description:** Retrieves paginated list of user's in-app notifications (non-archived by default).

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**

| Parameter     | Type             | Required | Description                                                                  | Default          |
| ------------- | ---------------- | -------- | ---------------------------------------------------------------------------- | ---------------- |
| `page`        | number           | No       | Page number (1-based, min: 1, max: 1000)                                     | 1                |
| `limit`       | number           | No       | Items per page (min: 1, max: 50)                                             | 10               |
| `search`      | string           | No       | Search term for filtering by title or message (max 255 chars)                | -                |
| `sortBy`      | string           | No       | Sort field and direction (format: `field:DIRECTION`, e.g., `createdAt:DESC`) | `createdAt:DESC` |
| `dateFrom`    | string           | No       | Filter notifications from this date (ISO 8601 format)                        | -                |
| `dateTo`      | string           | No       | Filter notifications to this date (ISO 8601 format)                          | -                |
| `read`        | boolean          | No       | Filter by read status: `true` for read, `false` for unread                   | -                |
| `type`        | NotificationType | No       | Filter by notification type (see NotificationType enum)                      | -                |
| `profileType` | ProfileType      | No       | Filter by profile type (see ProfileType enum)                                | -                |
| `cursor`      | string (UUID)    | No       | Cursor for cursor-based pagination (alternative to page-based)               | -                |

**Response Structure:**

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "title": "string",
      "message": "string",
      "actionUrl": "string | null",
      "actionType": "NAVIGATE | OPEN_MODAL | COPY_TEXT | EXTERNAL_LINK | NONE",
      "readAt": "ISO 8601 date | null",
      "type": "NotificationType enum value",
      "priority": 0-7,
      "icon": "string | null",
      "data": { "key": "value" },
      "isArchived": false,
      "expiresAt": "ISO 8601 date | null",
      "profileType": "ProfileType enum value | null",
      "profileId": "uuid | null",
      "channel": "IN_APP",
      "status": "PENDING | SENT | DELIVERED | FAILED",
      "createdAt": "ISO 8601 date",
      "updatedAt": "ISO 8601 date"
    }
  ],
  "meta": {
    "currentPage": 1,
    "itemCount": 10,
    "itemsPerPage": 10,
    "totalItems": 100,
    "totalPages": 10
  },
  "links": {
    "first": "/notifications/in-app?limit=10",
    "previous": "/notifications/in-app?page=1&limit=10",
    "next": "/notifications/in-app?page=3&limit=10",
    "last": "/notifications/in-app?page=10&limit=10"
  }
}
```

**Notes:**

- Only returns non-archived notifications by default
- `readAt` is `null` for unread notifications
- `isRead` can be calculated client-side: `readAt !== null`
- Default sorting is by `createdAt` descending (newest first)
- Search applies to `title` and `message` fields

---

### 2. Get Unread Notifications

**Endpoint:** `GET /notifications/in-app/unread`

**Description:** Retrieves all unread notifications for the user, optionally filtered by profile.

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**

| Parameter     | Type          | Required | Description            |
| ------------- | ------------- | -------- | ---------------------- |
| `profileType` | ProfileType   | No       | Filter by profile type |
| `profileId`   | string (UUID) | No       | Filter by profile ID   |

**Response Structure:**

Array of Notification objects (same structure as in paginated response, but without pagination metadata):

```json
[
  {
    "id": "uuid",
    "title": "string",
    "message": "string"
    // ... all other notification fields
  }
]
```

**Notes:**

- Returns only unread notifications (`readAt` is `null`)
- Returns only non-archived notifications
- Results are sorted by `createdAt` descending

---

### 3. Get Unread Count

**Endpoint:** `GET /notifications/in-app/unread/count`

**Description:** Returns the count of unread notifications, optionally filtered by profile.

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**

| Parameter     | Type          | Required | Description            |
| ------------- | ------------- | -------- | ---------------------- |
| `profileType` | ProfileType   | No       | Filter by profile type |
| `profileId`   | string (UUID) | No       | Filter by profile ID   |

**Response Structure:**

```json
{
  "count": 5,
  "profileType": "Admin | null",
  "profileId": "uuid | null"
}
```

**Notes:**

- Count includes only unread, non-archived notifications
- Response includes the filter parameters used (or `null` if not filtered)

---

### 4. Mark Notifications as Read

**Endpoint:** `PUT /notifications/in-app/read`

**Description:** Marks multiple notifications as read by their IDs.

**Authentication:** Required (JWT Bearer token)

**Request Body:**

```json
{
  "notificationIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Request Body Fields:**

| Field             | Type             | Required | Description                                            |
| ----------------- | ---------------- | -------- | ------------------------------------------------------ |
| `notificationIds` | string[] (UUIDs) | Yes      | Array of notification IDs to mark as read (min 1 item) |

**Response Structure:**

```json
{
  "success": true
}
```

**Notes:**

- Only marks notifications that belong to the authenticated user
- Updates `readAt` timestamp to current time
- Invalid or non-existent IDs are silently ignored

---

### 5. Mark All Notifications as Read

**Endpoint:** `PUT /notifications/in-app/read-all`

**Description:** Marks all unread notifications as read, optionally filtered by profile.

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**

| Parameter     | Type          | Required | Description            |
| ------------- | ------------- | -------- | ---------------------- |
| `profileType` | ProfileType   | No       | Filter by profile type |
| `profileId`   | string (UUID) | No       | Filter by profile ID   |

**Response Structure:**

```json
{
  "success": true
}
```

**Notes:**

- Marks all unread notifications for the user as read
- If `profileType` and `profileId` are provided, only marks notifications for that profile
- Updates `readAt` timestamp to current time

---

### 6. Archive a Notification

**Endpoint:** `PUT /notifications/in-app/:id/archive`

**Description:** Archives a single notification by ID.

**Authentication:** Required (JWT Bearer token)

**Path Parameters:**

| Parameter | Type          | Required | Description                |
| --------- | ------------- | -------- | -------------------------- |
| `id`      | string (UUID) | Yes      | Notification ID to archive |

**Response Structure:**

```json
{
  "success": true
}
```

**Notes:**

- Only archives notifications that belong to the authenticated user
- Sets `isArchived` to `true`
- Archived notifications are excluded from regular notification lists
- Returns 404 or error if notification doesn't exist or doesn't belong to user

---

### 7. Get Archived Notifications

**Endpoint:** `GET /notifications/in-app/archived`

**Description:** Retrieves paginated list of archived notifications.

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**

All parameters from `BasePaginationDto`:

- `page` (number, default: 1)
- `limit` (number, default: 10, max: 50)
- `search` (string)
- `sortBy` (string, format: `field:DIRECTION`)
- `dateFrom` (string, ISO 8601)
- `dateTo` (string, ISO 8601)

**Response Structure:**

Same pagination structure as "Get User Notifications" but contains only archived notifications (`isArchived: true`).

**Notes:**

- Only returns archived notifications
- Default sorting is by `createdAt` descending
- Search applies to `title` and `message` fields

---

## Notification History API

Base path: `/notifications/history`

### 1. Get Notification History

**Endpoint:** `GET /notifications/history`

**Description:** Retrieves paginated history of all notification delivery attempts across all channels (email, SMS, WhatsApp, in-app, etc.).

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**

All parameters from `BasePaginationDto` plus:

| Parameter | Type                | Required | Description                    |
| --------- | ------------------- | -------- | ------------------------------ |
| `status`  | NotificationStatus  | No       | Filter by delivery status      |
| `channel` | NotificationChannel | No       | Filter by notification channel |
| `type`    | NotificationType    | No       | Filter by notification type    |

**Response Structure:**

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "NotificationType enum value",
      "channel": "EMAIL | SMS | WHATSAPP | IN_APP | PUSH",
      "status": "PENDING | SENT | FAILED | RETRYING",
      "recipient": "string (email or phone number)",
      "metadata": { "key": "value" },
      "userId": "uuid | null",
      "centerId": "uuid | null",
      "profileType": "ProfileType enum value | null",
      "profileId": "uuid | null",
      "error": "string | null",
      "retryCount": 0,
      "lastAttemptAt": "ISO 8601 date | null",
      "createdAt": "ISO 8601 date",
      "updatedAt": "ISO 8601 date"
    }
  ],
  "meta": {
    "currentPage": 1,
    "itemCount": 10,
    "itemsPerPage": 10,
    "totalItems": 100,
    "totalPages": 10
  },
  "links": {
    "first": "/notifications/history?limit=10",
    "previous": "/notifications/history?page=1&limit=10",
    "next": "/notifications/history?page=3&limit=10",
    "last": "/notifications/history?page=10&limit=10"
  }
}
```

**Notes:**

- This endpoint shows delivery logs for all notification channels, not just in-app
- `recipient` contains the delivery address (email, phone number, etc.)
- `status` indicates delivery status: PENDING, SENT, FAILED, or RETRYING
- `error` field contains error message if delivery failed
- `retryCount` shows number of retry attempts
- Users can only see their own notification history
- Default sorting is by `createdAt` descending
- Search applies to `recipient` field

---

## Enums Reference

### NotificationType

Available notification types:

- `USER_REGISTERED`
- `USER_UPDATED`
- `USER_DELETED`
- `USER_RESTORED`
- `USER_ACTIVATED`
- `CENTER_CREATED`
- `CENTER_UPDATED`
- `CENTER_DELETED`
- `CENTER_RESTORED`
- `BRANCH_CREATED`
- `BRANCH_UPDATED`
- `BRANCH_DELETED`
- `PASSWORD_RESET`
- `EMAIL_VERIFICATION`
- `OTP_SENT`

### NotificationActionType

Determines how frontend should handle notification clicks:

- `NAVIGATE` - Navigate to internal route (use `actionUrl`)
- `OPEN_MODAL` - Open a modal/dialog
- `COPY_TEXT` - Copy text to clipboard
- `EXTERNAL_LINK` - Open external URL
- `NONE` - No action, just dismiss

### NotificationChannel

Notification delivery channels:

- `EMAIL`
- `SMS`
- `WHATSAPP`
- `IN_APP`
- `PUSH` (reserved for future mobile push notifications)

### NotificationStatus

Delivery status for notification history:

- `PENDING` - Notification queued for delivery
- `SENT` - Notification successfully sent
- `FAILED` - Delivery failed
- `RETRYING` - Currently retrying delivery

For in-app notifications in the Notification entity, status can also be:

- `DELIVERED` - Notification delivered to client

### ProfileType

User profile types:

- `Teacher`
- `Staff`
- `Parent`
- `Student`
- `Admin`

---

## Priority Levels

Notifications have a priority value from 0-7:

- **0-1**: Low priority (informational)
- **2-3**: Normal priority (standard notifications)
- **4-5**: High priority (important updates, warnings)
- **6-7**: Critical priority (urgent alerts, security events)

Frontend can use priority to:

- Display different visual indicators (badges, colors, icons)
- Sort notifications by importance
- Show priority badges or labels

---

## Data Field Structure

The `data` field in notifications is a flexible JSON object that can contain additional context. Common patterns:

- `centerId`: UUID of related center
- `branchId`: UUID of related branch
- `userId`: UUID of related user
- `entityId`: Generic entity ID
- `entityType`: Type of entity
- Custom fields specific to notification type

---

## Pagination

All paginated endpoints use the standard `Pagination<T>` format:

- `items`: Array of entities
- `meta`: Pagination metadata (currentPage, itemCount, itemsPerPage, totalItems, totalPages)
- `links`: Navigation links (first, previous, next, last)

**Pagination Parameters:**

- `page`: Page number (1-based, default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `sortBy`: Sort field and direction (format: `field:DIRECTION`, e.g., `createdAt:DESC`)
- `search`: Search term for text search
- `dateFrom`: Filter from date (ISO 8601 string)
- `dateTo`: Filter to date (ISO 8601 string)

---

## Error Responses

All endpoints may return standard HTTP error responses:

- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User doesn't have access to the resource
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

Error response structure:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Error type"
}
```

---

## Best Practices

1. **Real-time Updates**: Use WebSocket connection (see `FRONTEND_WEBSOCKET_INTEGRATION.md`) to receive real-time notifications instead of polling.

2. **Pagination**: Use pagination for large notification lists. Default limit is 10, but you can request up to 50 items per page.

3. **Caching**: Cache unread counts and notification lists client-side to reduce API calls.

4. **Read Status**: Calculate `isRead` client-side: `notification.readAt !== null`

5. **Action Handling**: Check `actionType` and `actionUrl` to determine how to handle notification clicks:
   - `NAVIGATE`: Navigate to `actionUrl` route
   - `OPEN_MODAL`: Open modal with data from `data` field
   - `COPY_TEXT`: Copy text from `data.text` or `message`
   - `EXTERNAL_LINK`: Open `actionUrl` in new tab
   - `NONE`: Just mark as read

6. **Priority Display**: Use priority to:
   - Show visual indicators (badges, colors)
   - Sort notifications
   - Filter important notifications

7. **Profile Filtering**: Use `profileType` and `profileId` to filter notifications for specific profiles (e.g., show only Admin notifications).

8. **Date Filtering**: Use `dateFrom` and `dateTo` for date range filtering. Format: ISO 8601 strings (e.g., `2024-01-01T00:00:00Z`).

9. **Search**: Use `search` parameter to search in notification titles and messages.

10. **Archived Notifications**: Archived notifications are excluded from regular lists. Use the archived endpoint to retrieve them separately.

---

## Integration Checklist

- [ ] Implement authentication with JWT Bearer token
- [ ] Set up WebSocket connection for real-time notifications
- [ ] Implement pagination for notification lists
- [ ] Handle all notification action types (NAVIGATE, OPEN_MODAL, etc.)
- [ ] Display priority indicators
- [ ] Implement mark as read functionality
- [ ] Implement mark all as read functionality
- [ ] Implement archive functionality
- [ ] Display unread count badge
- [ ] Filter notifications by profile type
- [ ] Handle date range filtering
- [ ] Implement search functionality
- [ ] Handle error responses gracefully
- [ ] Cache unread counts and notification lists

---

## Notes

- All timestamps are in ISO 8601 format
- All UUIDs are in standard UUID v4 format
- All endpoints automatically filter by the authenticated user (users can only see their own notifications)
- The `read` query parameter in "Get User Notifications" accepts boolean values: `true` for read, `false` for unread
- Archived notifications are permanently excluded from regular notification lists unless explicitly requested via the archived endpoint
- Notification history shows delivery attempts across all channels (email, SMS, WhatsApp, in-app, etc.)
- The `expiresAt` field indicates when a notification expires (if applicable). Expired notifications may be automatically cleaned up by the backend
