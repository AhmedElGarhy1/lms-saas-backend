# Backend API Response Reference 📋

## 🎯 **Purpose**

This document provides detailed information about the standardized backend API responses, field meanings, and error codes for frontend integration.

---

## ✅ **Success Response Structure**

### **Standard Success Response**

```json
{
  "success": true,
  "data": {
    /* actual response data */
  },
  "message": "User created successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456789",
  "processingTime": 45
}
```

### **Field Descriptions**

| Field            | Type      | Description                            | Example                           |
| ---------------- | --------- | -------------------------------------- | --------------------------------- |
| `success`        | `boolean` | Always `true` for successful responses | `true`                            |
| `data`           | `any`     | The actual response payload            | `{ "id": "123", "name": "John" }` |
| `message`        | `string`  | User-friendly success message          | `"User created successfully"`     |
| `timestamp`      | `string`  | ISO 8601 timestamp of response         | `"2024-01-15T10:30:00.000Z"`      |
| `requestId`      | `string`  | Unique identifier for request tracking | `"req_123456789"`                 |
| `processingTime` | `number`  | Response time in milliseconds          | `45`                              |

---

## ❌ **Error Response Structure**

### **Standard Error Response**

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid 2FA code provided",
    "userMessage": "Invalid credentials provided",
    "actionRequired": "Please check your credentials and try again",
    "type": "AUTHENTICATION_ERROR",
    "retryable": true,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "details": [
      {
        "field": "email",
        "value": "invalid@email",
        "message": "Email format is invalid",
        "code": "INVALID_EMAIL_FORMAT",
        "suggestion": "Please enter a valid email address"
      }
    ]
  }
}
```

### **Error Object Field Descriptions**

| Field            | Type      | Description                                 | Example                                         |
| ---------------- | --------- | ------------------------------------------- | ----------------------------------------------- |
| `code`           | `string`  | Machine-readable error code                 | `"AUTHENTICATION_FAILED"`                       |
| `message`        | `string`  | Technical error message for developers      | `"Invalid 2FA code provided"`                   |
| `userMessage`    | `string`  | **User-friendly error message**             | `"Invalid credentials provided"`                |
| `actionRequired` | `string`  | **What the user should do next**            | `"Please check your credentials and try again"` |
| `type`           | `string`  | Error category for UI handling              | `"AUTHENTICATION_ERROR"`                        |
| `retryable`      | `boolean` | Whether the user can retry the action       | `true`                                          |
| `timestamp`      | `string`  | ISO 8601 timestamp of error                 | `"2024-01-15T10:30:00.000Z"`                    |
| `details`        | `array`   | Field-specific validation errors (optional) | See below                                       |

### **Error Details Array (for validation errors)**

| Field        | Type     | Description                          | Example                                |
| ------------ | -------- | ------------------------------------ | -------------------------------------- |
| `field`      | `string` | Form field name that has the error   | `"email"`                              |
| `value`      | `any`    | The invalid value that was submitted | `"invalid@email"`                      |
| `message`    | `string` | Field-specific error message         | `"Email format is invalid"`            |
| `code`       | `string` | Field-specific error code            | `"INVALID_EMAIL_FORMAT"`               |
| `suggestion` | `string` | Helpful suggestion (optional)        | `"Please enter a valid email address"` |

---

## 🔍 **Error Codes Reference**

## 🌐 **Global Error Handling**

These errors should be handled by a **global error handler** that intercepts all API responses:

### **Authentication Errors** (Global Handler)

| Code                    | Type                   | User Message                         | Action Required                               | Global Action               |
| ----------------------- | ---------------------- | ------------------------------------ | --------------------------------------------- | --------------------------- |
| `AUTHENTICATION_FAILED` | `AUTHENTICATION_ERROR` | "Invalid credentials provided"       | "Please check your credentials and try again" | **Redirect to login page**  |
| `TOKEN_EXPIRED`         | `AUTHENTICATION_ERROR` | "Your session has expired"           | "Please log in again"                         | **Auto-redirect to login**  |
| `INVALID_TOKEN`         | `AUTHENTICATION_ERROR` | "Invalid authentication token"       | "Please log in again"                         | **Clear tokens & redirect** |
| `TWO_FA_REQUIRED`       | `AUTHENTICATION_ERROR` | "Two-factor authentication required" | "Please enter your 2FA code"                  | **Show 2FA modal**          |
| `TWO_FA_FAILED`         | `AUTHENTICATION_ERROR` | "Invalid 2FA code"                   | "Please check your 2FA code and try again"    | **Show 2FA error in modal** |

### **Authorization Errors** (Global Handler)

| Code                       | Type                  | User Message                                       | Action Required                                          | Global Action                     |
| -------------------------- | --------------------- | -------------------------------------------------- | -------------------------------------------------------- | --------------------------------- |
| `INSUFFICIENT_PERMISSIONS` | `AUTHORIZATION_ERROR` | "You don't have permission to perform this action" | "Contact your administrator for access"                  | **Show global permission denied** |
| `ACCESS_DENIED`            | `AUTHORIZATION_ERROR` | "Access denied to this resource"                   | "You don't have access to this center"                   | **Show access denied overlay**    |
| `ROLE_REQUIRED`            | `AUTHORIZATION_ERROR` | "Required role not assigned"                       | "Contact your administrator to assign the required role" | **Show role required message**    |

### **Rate Limiting & Global System Errors** (Global Handler)

| Code                    | Type               | User Message                          | Action Required                             | Global Action                  |
| ----------------------- | ------------------ | ------------------------------------- | ------------------------------------------- | ------------------------------ |
| `RATE_LIMIT_EXCEEDED`   | `RATE_LIMIT_ERROR` | "Too many requests, please slow down" | "Please wait before trying again"           | **Show rate limit overlay**    |
| `MAINTENANCE_MODE`      | `SYSTEM_ERROR`     | "System is under maintenance"         | "Please try again later"                    | **Show maintenance page**      |
| `SERVICE_UNAVAILABLE`   | `SYSTEM_ERROR`     | "Service is temporarily unavailable"  | "Please try again in a few minutes"         | **Show service unavailable**   |
| `NETWORK_ERROR`         | `SYSTEM_ERROR`     | "Unable to connect to the server"     | "Please check your internet connection"     | **Show network error overlay** |
| `INTERNAL_SERVER_ERROR` | `SYSTEM_ERROR`     | "An unexpected error occurred"        | "Please try again later or contact support" | **Show generic error overlay** |

### **Database Errors** (Global Handler - TypeORM)

| Code                   | Type             | User Message                       | Action Required                | Global Action                |
| ---------------------- | ---------------- | ---------------------------------- | ------------------------------ | ---------------------------- |
| `DATABASE_CONFLICT`    | `DATABASE_ERROR` | "Temporary database conflict"      | "Please retry your request"    | **Show retry overlay**       |
| `DATABASE_DEADLOCK`    | `DATABASE_ERROR` | "Database operation conflict"      | "Please retry your request"    | **Show retry overlay**       |
| `DATABASE_UNAVAILABLE` | `DATABASE_ERROR` | "Database temporarily unavailable" | "Please try again in a moment" | **Show service unavailable** |

---

## 📋 **Request-Specific Error Handling**

These errors should be handled **per request/component** and not globally:

### **Resource Errors** (Request-Specific)

| Code                      | Type             | User Message                                      | Action Required                     | Handler Location                        |
| ------------------------- | ---------------- | ------------------------------------------------- | ----------------------------------- | --------------------------------------- |
| `RESOURCE_NOT_FOUND`      | `RESOURCE_ERROR` | "The requested resource was not found"            | "Please check the ID and try again" | **In the component making the request** |
| `RESOURCE_ALREADY_EXISTS` | `RESOURCE_ERROR` | "A resource with this information already exists" | "Please use different information"  | **In the form/component**               |
| `RESOURCE_CONFLICT`       | `RESOURCE_ERROR` | "Resource conflict detected"                      | "Please refresh and try again"      | **In the component**                    |

### **Validation Errors** (Request-Specific)

| Code                     | Type               | User Message                            | Action Required                      | Handler Location          |
| ------------------------ | ------------------ | --------------------------------------- | ------------------------------------ | ------------------------- |
| `VALIDATION_FAILED`      | `VALIDATION_ERROR` | "Please check your input and try again" | "Fix the highlighted errors below"   | **In the form component** |
| `REQUIRED_FIELD_MISSING` | `VALIDATION_ERROR` | "Required field is missing"             | "Please fill in all required fields" | **In the form component** |
| `INVALID_FORMAT`         | `VALIDATION_ERROR` | "Invalid format provided"               | "Please use the correct format"      | **In the form component** |
| `VALUE_TOO_LONG`         | `VALIDATION_ERROR` | "Value is too long"                     | "Please shorten your input"          | **In the form component** |
| `VALUE_TOO_SHORT`        | `VALIDATION_ERROR` | "Value is too short"                    | "Please provide more information"    | **In the form component** |

### **Business Logic Errors** (Request-Specific)

| Code                       | Type             | User Message                      | Action Required                               | Handler Location     |
| -------------------------- | ---------------- | --------------------------------- | --------------------------------------------- | -------------------- |
| `BUSINESS_LOGIC_VIOLATION` | `BUSINESS_ERROR` | "This action cannot be performed" | "Please check the requirements and try again" | **In the component** |
| `OPERATION_NOT_ALLOWED`    | `BUSINESS_ERROR` | "This operation is not allowed"   | "Contact support if you need this feature"    | **In the component** |
| `QUOTA_EXCEEDED`           | `BUSINESS_ERROR` | "You have reached your limit"     | "Please upgrade your plan or contact support" | **In the component** |
| `DATABASE_ERROR`           | `SYSTEM_ERROR`   | "Database connection failed"      | "Please try again later"                      | **In the component** |

---

## 📊 **Pagination Response Structure**

### **Paginated Data Response**

```json
{
  "success": true,
  "data": {
    "data": [
      { "id": "1", "name": "User 1" },
      { "id": "2", "name": "User 2" }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  },
  "message": "Users retrieved successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456789",
  "processingTime": 120
}
```

### **Pagination Meta Fields**

| Field        | Type     | Description                   | Example |
| ------------ | -------- | ----------------------------- | ------- |
| `page`       | `number` | Current page number (1-based) | `1`     |
| `limit`      | `number` | Number of items per page      | `10`    |
| `total`      | `number` | Total number of items         | `25`    |
| `totalPages` | `number` | Total number of pages         | `3`     |

---

## 🗄️ **TypeORM Database Error Mapping**

### **Database Error Codes (Internal)**

The TypeORM exception filter automatically maps database errors to standardized responses:

| Database Error Code       | PostgreSQL | MySQL                           | Response Code             | User Message                                 |
| ------------------------- | ---------- | ------------------------------- | ------------------------- | -------------------------------------------- |
| **Unique Violation**      | `23505`    | `ER_DUP_ENTRY` (1062)           | `409 Conflict`            | "Duplicate resource"                         |
| **Foreign Key Violation** | `23503`    | `ER_NO_REFERENCED_ROW_2` (1452) | `400 Bad Request`         | "Related entity missing"                     |
| **Not Null Violation**    | `23502`    | -                               | `400 Bad Request`         | "A required field is missing"                |
| **Serialization Failure** | `40001`    | -                               | `503 Service Unavailable` | "Temporary database conflict. Please retry." |
| **Deadlock Detected**     | `40P01`    | -                               | `503 Service Unavailable` | "Temporary database conflict. Please retry." |
| **Entity Not Found**      | -          | -                               | `404 Not Found`           | "Entity not found"                           |

### **Database Error Response Format**

The TypeORM filter now uses our custom exceptions, so database errors follow the same enhanced format:

```json
{
  "statusCode": 409,
  "message": "Duplicate resource (constraint: UQ_user_email)",
  "error": "Conflict",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userMessage": "A resource with this information already exists.",
  "actionRequired": "Please use different information or update the existing resource.",
  "retryable": false
}
```

### **Retryable Database Errors**

These database errors include `retryable: true` and should be handled with retry logic:

- **Serialization Failure** (`40001`) - Transaction conflict
- **Deadlock Detected** (`40P01`) - Concurrent access conflict

---

## 🎯 **Global vs Request-Specific Handling Logic**

### **🌐 Global Error Handler Should Handle:**

**Authentication & Authorization Issues:**

- `AUTHENTICATION_FAILED` → Redirect to login
- `TOKEN_EXPIRED` → Auto-redirect to login
- `INSUFFICIENT_PERMISSIONS` → Show global permission denied
- `ACCESS_DENIED` → Show access denied overlay

**System-Wide Issues:**

- `RATE_LIMIT_EXCEEDED` → Show rate limit overlay
- `MAINTENANCE_MODE` → Show maintenance page
- `SERVICE_UNAVAILABLE` → Show service unavailable
- `NETWORK_ERROR` → Show network error overlay

**Database Issues:**

- `DATABASE_CONFLICT` → Show retry overlay
- `DATABASE_DEADLOCK` → Show retry overlay
- `DATABASE_UNAVAILABLE` → Show service unavailable

**Why Global:** These affect the entire application state and user session, not just a specific request.

### **📋 Request-Specific Handler Should Handle:**

**Data & Validation Issues:**

- `RESOURCE_NOT_FOUND` → Show "not found" in the component
- `VALIDATION_FAILED` → Show field errors in the form
- `RESOURCE_ALREADY_EXISTS` → Show conflict message in form
- `BUSINESS_LOGIC_VIOLATION` → Show business error in component

**Why Request-Specific:** These are context-specific to the user's current action and should be handled where the user is working.

### **🔄 Implementation Strategy:**

```typescript
// Global Error Handler (HTTP Interceptor)
if (
  error.type === 'AUTHENTICATION_ERROR' ||
  error.type === 'AUTHORIZATION_ERROR' ||
  error.code === 'RATE_LIMIT_EXCEEDED' ||
  error.code === 'MAINTENANCE_MODE' ||
  (error.statusCode === 503 && error.retryable === true) // Database conflicts
) {
  // Handle globally - redirect, show overlay, etc.
  return handleGlobally(error);
}

// Request-Specific Handler (Component Level)
if (
  error.type === 'VALIDATION_ERROR' ||
  error.type === 'RESOURCE_ERROR' ||
  error.type === 'BUSINESS_ERROR' ||
  error.statusCode === 409 || // Database conflicts (duplicates)
  error.statusCode === 400 // Database validation errors
) {
  // Handle in component - show form errors, component messages
  return handleInComponent(error);
}
```

---

## 🎯 **Error Type Categories**

### **Error Type Meanings**

| Type                   | Description                | UI Handling Suggestion             |
| ---------------------- | -------------------------- | ---------------------------------- |
| `AUTHENTICATION_ERROR` | User needs to authenticate | Redirect to login page             |
| `AUTHORIZATION_ERROR`  | User lacks permissions     | Show access denied message         |
| `VALIDATION_ERROR`     | Input validation failed    | Highlight form fields with errors  |
| `RESOURCE_ERROR`       | Resource-related issues    | Show not found or conflict message |
| `BUSINESS_ERROR`       | Business rule violations   | Show business logic error message  |
| `SYSTEM_ERROR`         | Server/system issues       | Show generic error, suggest retry  |

---

## 🔄 **Retry Logic Guidelines**

### **Retryable Errors**

- `retryable: true` - User can retry the action
- Show retry button or allow form resubmission
- Examples: Network errors, temporary server issues

### **Non-Retryable Errors**

- `retryable: false` - User should not retry
- Show error message without retry option
- Examples: Authentication failures, validation errors

---

## 📝 **Message Usage Guidelines**

### **For Success Messages**

- Use `response.message` for user feedback
- Examples: "User created successfully", "Password changed successfully"

### **For Error Messages**

- Use `response.error.userMessage` for user display
- Use `response.error.actionRequired` for guidance
- Use `response.error.details[].message` for field-specific errors

### **For Development/Debugging**

- Use `response.error.message` for technical details
- Use `response.error.code` for error handling logic
- Use `response.requestId` for support requests

---

## 🚀 **Integration Checklist**

### **✅ Global Error Handler Setup**

- [ ] Implement HTTP interceptor for global error handling
- [ ] Handle `AUTHENTICATION_ERROR` types globally (redirect to login)
- [ ] Handle `AUTHORIZATION_ERROR` types globally (show permission denied)
- [ ] Handle `RATE_LIMIT_EXCEEDED` globally (show rate limit overlay)
- [ ] Handle `MAINTENANCE_MODE` globally (show maintenance page)
- [ ] Handle `SERVICE_UNAVAILABLE` globally (show service unavailable)
- [ ] Handle `NETWORK_ERROR` globally (show network error overlay)
- [ ] Handle database conflicts (503 with retryable) globally (show retry overlay)
- [ ] Handle database deadlocks globally (show retry overlay)

### **✅ Request-Specific Error Handling**

- [ ] Check `success` field first in components
- [ ] Display `userMessage` for request-specific errors
- [ ] Show `actionRequired` guidance in components
- [ ] Handle `details` array for field errors in forms
- [ ] Handle `VALIDATION_ERROR` types in form components
- [ ] Handle `RESOURCE_ERROR` types in data components
- [ ] Handle `BUSINESS_ERROR` types in action components
- [ ] Handle database duplicates (409) in form components
- [ ] Handle database validation errors (400) in form components

### **✅ Optional Enhancements**

- [ ] Show `processingTime` for performance feedback
- [ ] Use `requestId` for support requests
- [ ] Implement retry logic based on `retryable`
- [ ] Use `timestamp` for error logging
- [ ] Handle pagination `meta` fields
- [ ] Use `type` for error categorization logic

---

## 📞 **Support Information**

### **For Frontend Issues**

- Include `requestId` in bug reports
- Provide `timestamp` of error occurrence
- Share `error.code` and `error.type`

### **For User Support**

- Share `userMessage` with users
- Provide `actionRequired` guidance
- Use `retryable` to determine next steps

This reference provides everything needed to properly handle backend responses in your existing frontend! 🎉
