# Error Codes Reference

This document provides a comprehensive list of all error codes used in the application's exception handling system.

## Error Response Format

All error responses follow this standardized format:

```json
{
  "statusCode": 403,
  "message": "You do not have access to center",
  "error": "Forbidden",
  "code": "INSUFFICIENT_PERMISSIONS",
  "timestamp": "2025-01-14T21:47:10.379Z",
  "userMessage": "You do not have permission to perform this action.",
  "actionRequired": "Please contact an administrator for access.",
  "retryable": false,
  "details": [
    {
      "field": "centerId",
      "value": null,
      "message": "Center ID is required for this operation",
      "code": "CENTER_SELECTION_REQUIRED",
      "suggestion": "Please select a center from the dropdown or contact your administrator"
    }
  ]
}
```

## Error Codes by Category

### Authentication & Authorization (4xx)

| Code                        | Status | Description                     | User Action                                         |
| --------------------------- | ------ | ------------------------------- | --------------------------------------------------- |
| `AUTHENTICATION_FAILED`     | 401    | Invalid credentials provided    | Check credentials and try again                     |
| `INSUFFICIENT_PERMISSIONS`  | 403    | User lacks required permissions | Contact administrator for access                    |
| `ACCESS_DENIED`             | 403    | Access to resource denied       | Contact administrator for access                    |
| `ADMIN_SCOPE_ACCESS_DENIED` | 403    | No admin scope access           | Select a center to access center-specific resources |
| `CENTER_SELECTION_REQUIRED` | 400    | Center must be selected         | Select a center from available options              |
| `CENTER_ACCESS_DENIED`      | 403    | No access to specific center    | Contact administrator to request center access      |

### Validation & Input (4xx)

| Code                   | Status | Description                        | User Action                                 |
| ---------------------- | ------ | ---------------------------------- | ------------------------------------------- |
| `VALIDATION_FAILED`    | 400    | Input validation failed            | Fix highlighted errors and try again        |
| `PASSWORD_TOO_WEAK`    | 400    | Password doesn't meet requirements | Ensure password meets security requirements |
| `INVALID_OPERATION`    | 400    | Operation not allowed              | Check operation parameters and try again    |
| `BUSINESS_LOGIC_ERROR` | 400    | Business rule violation            | Check input and try again                   |

### Resource Management (4xx)

| Code                      | Status | Description                    | User Action                                  |
| ------------------------- | ------ | ------------------------------ | -------------------------------------------- |
| `RESOURCE_NOT_FOUND`      | 404    | Requested resource not found   | Check resource ID and try again              |
| `RESOURCE_ALREADY_EXISTS` | 409    | Resource with same info exists | Use different information or update existing |
| `RESOURCE_IN_USE`         | 409    | Resource currently in use      | Try again later or contact support           |
| `USER_ALREADY_EXISTS`     | 409    | User with email already exists | Use different email or try logging in        |

### Server Errors (5xx)

| Code                    | Status | Description                     | User Action                        |
| ----------------------- | ------ | ------------------------------- | ---------------------------------- |
| `INTERNAL_SERVER_ERROR` | 500    | Unexpected server error         | Try again later or contact support |
| `SERVICE_UNAVAILABLE`   | 503    | Service temporarily unavailable | Try again later                    |

### Generic HTTP Status Codes

| Code                   | Status | Description                  |
| ---------------------- | ------ | ---------------------------- |
| `BAD_REQUEST`          | 400    | Generic bad request          |
| `UNAUTHORIZED`         | 401    | Generic unauthorized         |
| `FORBIDDEN`            | 403    | Generic forbidden            |
| `NOT_FOUND`            | 404    | Generic not found            |
| `CONFLICT`             | 409    | Generic conflict             |
| `UNPROCESSABLE_ENTITY` | 422    | Generic unprocessable entity |
| `TOO_MANY_REQUESTS`    | 429    | Generic too many requests    |
| `UNKNOWN_ERROR`        | -      | Fallback for unknown errors  |

## Frontend Integration Guidelines

### Error Handling Strategy

1. **Check the `code` field** for specific error handling logic
2. **Display `userMessage`** to the user (user-friendly message)
3. **Use `actionRequired`** to guide user actions
4. **Check `retryable`** to determine if the operation can be retried
5. **Use `details`** array for field-specific validation errors

### Example Frontend Error Handling

```typescript
import { ErrorCode } from './enums/error-codes.enum';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  code: ErrorCode;
  timestamp: string;
  userMessage: string;
  actionRequired: string;
  retryable: boolean;
  details?: Array<{
    field: string;
    value: unknown;
    message: string;
    code: ErrorCode;
    suggestion?: string;
  }>;
}

function handleError(error: ErrorResponse) {
  switch (error.code) {
    case ErrorCode.CENTER_SELECTION_REQUIRED:
      // Show center selection modal
      showCenterSelectionModal();
      break;

    case ErrorCode.AUTHENTICATION_FAILED:
      // Redirect to login
      redirectToLogin();
      break;

    case ErrorCode.VALIDATION_FAILED:
      // Show field-specific errors
      showValidationErrors(error.details);
      break;

    case ErrorCode.INSUFFICIENT_PERMISSIONS:
      // Show permission denied message
      showPermissionDeniedMessage(error.userMessage);
      break;

    case ErrorCode.CENTER_ACCESS_DENIED:
      // Show center access denied message
      showCenterAccessDeniedMessage(error.userMessage);
      break;

    default:
      // Show generic error message
      showGenericError(error.userMessage);
  }
}
```

### Special Error Codes for UX

- **`CENTER_SELECTION_REQUIRED`**: Triggers center selection flow
- **`ADMIN_SCOPE_ACCESS_DENIED`**: Converts to center selection requirement
- **`VALIDATION_FAILED`**: Shows field-specific validation errors
- **`PASSWORD_TOO_WEAK`**: Shows password requirements

## Testing Error Codes

When testing, you can trigger specific error codes by:

1. **Authentication errors**: Use invalid credentials
2. **Permission errors**: Use user without required permissions
3. **Validation errors**: Submit invalid form data
4. **Resource errors**: Access non-existent resources
5. **Center selection**: Access admin endpoints without center selection

## Error Code Enum

All error codes are defined in the `ErrorCode` enum for type safety and IntelliSense support:

```typescript
import { ErrorCode } from '@/shared/common/enums/error-codes.enum';

// Type-safe error code usage
const errorCode: ErrorCode = ErrorCode.AUTHENTICATION_FAILED;

// Switch statement with enum
switch (error.code) {
  case ErrorCode.CENTER_SELECTION_REQUIRED:
    // Handle center selection
    break;
  case ErrorCode.AUTHENTICATION_FAILED:
    // Handle authentication
    break;
}
```

## Error Code Naming Convention

- **Format**: `UPPER_SNAKE_CASE`
- **Pattern**: `[CATEGORY]_[SPECIFIC_ERROR]`
- **Examples**:
  - `AUTHENTICATION_FAILED`
  - `CENTER_SELECTION_REQUIRED`
  - `RESOURCE_NOT_FOUND`
  - `VALIDATION_FAILED`

## Benefits of Using Enum

1. **Type Safety**: Prevents typos and ensures only valid error codes are used
2. **IntelliSense**: IDE autocomplete for all available error codes
3. **Refactoring**: Easy to rename error codes across the entire codebase
4. **Documentation**: Self-documenting code with clear error code definitions
5. **Consistency**: Ensures consistent error code usage across all modules
