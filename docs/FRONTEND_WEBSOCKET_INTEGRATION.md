# Frontend WebSocket Notification Integration Guide

## Overview

The backend provides a real-time WebSocket notification system using Socket.IO. This guide covers connecting, authenticating, and handling in-app notifications.

---

## Connection Details

### WebSocket Endpoint

- **Namespace**: `/notifications`
- **Full URL Format**: `{BACKEND_URL}/notifications`
  - **Development**: `ws://localhost:{PORT}/notifications` or `http://localhost:{PORT}/notifications`
  - **Production**: `wss://{YOUR_DOMAIN}/notifications` or `https://{YOUR_DOMAIN}/notifications`

### CORS Configuration

- Allowed origins:
  - `http://localhost:3001` (development)
  - `https://lms-saas-khaki.vercel.app` (production)
- Credentials: `true` (cookies/headers)

---

## Authentication

### Token Requirements

Authenticate using a JWT access token. Provide it via one of:

1. Query parameter (recommended):

   ```
   ws://localhost:3000/notifications?token=YOUR_JWT_TOKEN
   ```

2. Authorization header:
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

### Token Validation

- Token must be a valid JWT access token (not refresh)
- User must exist and be active
- Invalid or expired tokens result in connection rejection

### Authentication Flow

1. Client connects to WebSocket endpoint with token
2. Backend validates token via `WebSocketAuthGuard`
3. If valid: connection established, user ID stored in socket data
4. If invalid: connection rejected with error message

---

## Connection Lifecycle

### Connection Events

1. `connect` / `connection` — Connection established
2. `disconnect` — Connection closed (manual or server-side)
3. `error` — Connection error

### Connection Management

- Establish connection after user login
- Reconnect on disconnect (with backoff)
- Close connection on logout
- Handle network interruptions

---

## Server-to-Client Events (Listen)

### 1. `notification:new`

Emitted when a new notification is delivered.

**Event Name**: `notification:new`

**Payload Structure**:

```typescript
{
  id: string;                    // UUID of the notification
  title: string;                  // Notification title
  message: string;                // Notification message/content
  actionUrl?: string | null;      // URL to navigate to (if actionType is NAVIGATE)
  actionType?: string | null;     // Type of action (see Action Types below)
  type: string;                   // Notification type (see Notification Types below)
  priority: number;               // Priority level (0-7, higher = more urgent)
  icon?: string | null;           // Icon identifier/name (optional)
  readAt?: string | null;        // ISO timestamp when notification was read (null if unread)
  createdAt: string;              // ISO timestamp when notification was created
}
```

**Note**: The `severity` field has been removed. Severity can be derived from `priority` if needed:

- Priority 0-1: info
- Priority 2-3: success
- Priority 4-5: warning
- Priority 6-7: error

**Example Payload**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Center Updated",
  "message": "The center 'ABC Learning Center' has been updated by John Doe.",
  "actionUrl": "/centers/123",
  "actionType": "NAVIGATE",
  "type": "CENTER_UPDATED",
  "priority": 3,
  "icon": "building",
  "readAt": null,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**When to Handle**:

- Display notification immediately (toast, banner, etc.)
- Update notification list/badge count
- Play sound/vibration if appropriate
- Store notification locally

---

### 2. `notification:throttled` (Debug-Only)

**⚠️ IMPORTANT**: This event is for debugging/monitoring only. It is **NOT required** for client implementation.

Emitted when rate limiting prevents delivery. You can safely ignore this event in production client code.

**Event Name**: `notification:throttled`

**Payload Structure**:

```typescript
{
  reason: string; // Always "rate-limit"
  type: string; // Always "user"
  limit: number; // Rate limit value (e.g., 100)
  window: string; // Time window (e.g., "1 minute")
}
```

**Example Payload**:

```json
{
  "reason": "rate-limit",
  "type": "user",
  "limit": 100,
  "window": "1 minute"
}
```

**When to Handle**:

- Optional: Log for debugging/monitoring purposes
- No action required; notifications will resume when the limit resets
- Can be safely ignored in production

---

## Client-to-Server Events (Send)

### 1. `notification:read`

Acknowledge that a notification was read (optional, for analytics).

**Event Name**: `notification:read`

**Payload Structure**:

```typescript
{
  notificationId: string; // UUID of the notification
}
```

**Example**:

```json
{
  "notificationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**When to Send**:

- After user views/opens the notification
- Note: Actual read status is updated via REST API, not WebSocket

---

## Notification Types

Enum values for `type`:

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

---

## Action Types

Enum values for `actionType`:

- `NAVIGATE` — Navigate to `actionUrl`
- `OPEN_MODAL` — Open a modal/dialog
- `COPY_TEXT` — Copy text to clipboard
- `EXTERNAL_LINK` — Open external URL
- `NONE` — No action, just dismiss

---

## Priority Levels

- Range: `0` (lowest) to `7` (highest)
- Higher values indicate more urgent notifications
- Use for sorting/filtering
- **Severity can be derived from priority**:
  - 0-1: info
  - 2-3: success
  - 4-5: warning
  - 6-7: error

---

## Rate Limiting

### Limits

- Per User: 100 notifications per minute (configurable via `WEBSOCKET_RATE_LIMIT_USER`)
- Window: 1 minute (sliding window)

### Behavior

- If limit exceeded, `notification:throttled` is emitted (debug-only event)
- Notification is not delivered (stored in DB for later)
- Limits reset automatically after the window
- No action required from client

**Note**: Socket-level rate limiting has been removed. Only user-level rate limiting is enforced.

---

## Best Practices

### Connection Management

1. Connect after successful login
2. Disconnect on logout
3. Implement auto-reconnect with exponential backoff
4. Handle network interruptions gracefully

### Error Handling

1. Handle connection errors
2. Handle authentication failures (redirect to login)
3. Handle rate limit warnings (log, don't block UI) - optional
4. Handle malformed payloads (log error, skip notification)

### Performance

1. Debounce rapid notifications
2. Batch UI updates if multiple notifications arrive quickly
3. Limit concurrent notifications displayed
4. Clean up old notifications from memory

### User Experience

1. Show notifications immediately (toast, banner, etc.)
2. Update notification badge count
3. Play sound/vibration for high-priority notifications (priority 4-7)
4. Group related notifications when appropriate
5. Allow user to dismiss notifications
6. Navigate to `actionUrl` when `actionType` is `NAVIGATE`

### Data Management

1. Store notifications locally for offline access
2. Sync with REST API periodically
3. Mark notifications as read via REST API
4. Handle notification expiry (if `expiresAt` is present)

---

## Integration Checklist

- [ ] Install Socket.IO client library
- [ ] Implement authentication token passing
- [ ] Establish WebSocket connection on login
- [ ] Listen for `notification:new` event
- [ ] Display notifications in UI (toast/banner/list)
- [ ] Handle notification clicks/navigation
- [ ] Send `notification:read` acknowledgment (optional)
- [ ] Implement reconnection logic
- [ ] Handle disconnection gracefully
- [ ] Update notification badge/count
- [ ] Sync with REST API for full notification list
- [ ] Test with multiple browser tabs (same user)
- [ ] Test connection stability
- [ ] **Ignore** `notification:throttled` event (debug-only)

---

## Testing Scenarios

1. Successful connection with valid token
2. Connection rejection with invalid token
3. Receiving single notification
4. Receiving multiple notifications rapidly
5. Reconnection after network interruption
6. Multiple tabs for same user (all should receive notifications)
7. Rate limiting (throttled event - can be ignored)
8. Notification click/navigation
9. Logout disconnection

---

## Troubleshooting

### Connection Fails

- Check token validity
- Verify CORS configuration
- Check backend URL/port
- Check network connectivity

### Not Receiving Notifications

- Verify connection is established
- Check user is active
- Verify token is valid
- Check rate limiting (may be throttled)
- Check backend logs for errors

### Notifications Duplicate

- Normal if multiple tabs are open (same user)
- Each tab receives the notification
- Deduplicate by `id` if needed

### Performance Issues

- Too many notifications displayed
- Not debouncing rapid notifications
- Not cleaning up old notifications
- Connection not properly closed

---

## Additional Notes

### Multi-Tab Support

- All tabs for the same user receive notifications
- Backend uses Redis to track all active connections
- Each tab has its own socket connection

### Notification Persistence

- Notifications are stored in the database
- REST API provides endpoints to fetch notifications
- WebSocket is for real-time delivery only
- Use REST API for full notification history

### Offline Support

- Notifications won't be delivered if WebSocket is disconnected
- Use REST API to fetch missed notifications when reconnecting
- Store notifications locally for offline viewing

### Severity Field Removal

The `severity` field has been removed from the notification payload. If you need severity information, derive it from the `priority` field:

```typescript
function getSeverityFromPriority(
  priority: number,
): 'info' | 'success' | 'warning' | 'error' {
  if (priority <= 1) return 'info';
  if (priority <= 3) return 'success';
  if (priority <= 5) return 'warning';
  return 'error';
}
```

---

## REST API Integration

WebSocket handles real-time delivery. Use REST API for:

- Fetching notification history
- Marking notifications as read
- Deleting/archiving notifications
- Fetching notification preferences
- Managing notification settings

Refer to REST API documentation for endpoints.

---

## Support

For issues:

1. Check backend logs for WebSocket errors
2. Verify token validity
3. Check rate limiting status
4. Verify CORS configuration
5. Test with a simple Socket.IO client

---

End of Frontend WebSocket Integration Guide
