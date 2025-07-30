# Error Handling and Validation

This document describes the comprehensive error handling and validation system implemented in the LMS backend.

## Overview

The application implements a multi-layered error handling approach that provides:

- Consistent error response formats
- Detailed validation error messages
- Comprehensive logging with context
- Database error handling
- Rate limiting protection
- Custom business logic exceptions

## Components

### 1. Error Interceptor (`src/common/interceptors/error.interceptor.ts`)

The error interceptor catches all unhandled errors and provides:

- **Contextual Logging**: Logs errors with request context (method, URL, user agent, IP, user ID)
- **Database Error Handling**: Handles PostgreSQL-specific errors (constraint violations, foreign key errors)
- **Validation Error Handling**: Processes Zod and class-validator errors
- **TypeORM Error Handling**: Handles database operation failures
- **Standardized Error Responses**: Ensures consistent error response format

#### Supported Error Types:

- **Unique Constraint Violation** (23505): Returns 409 Conflict
- **Foreign Key Constraint Violation** (23503): Returns 400 Bad Request
- **Table Not Found** (42P01): Returns 500 Internal Server Error
- **Validation Errors**: Returns 400 Bad Request with detailed error information
- **Zod Validation Errors**: Returns 400 Bad Request with validation details
- **TypeORM Errors**: Returns 400 Bad Request for database operation failures
- **Entity Not Found**: Returns 404 Not Found

### 2. HTTP Exception Filter (`src/common/filters/http-exception.filter.ts`)

Handles HTTP exceptions and provides:

- **Enhanced Logging**: Logs HTTP exceptions with full context
- **Consistent Response Format**: Standardizes error response structure
- **Request Context**: Includes request method, URL, and user information

### 3. Custom Validation Pipe (`src/common/pipes/validation.pipe.ts`)

Provides enhanced validation with:

- **Whitelist Validation**: Only allows defined properties
- **Forbidden Non-Whitelisted**: Rejects unknown properties
- **Detailed Error Reporting**: Provides field-level validation errors
- **Structured Error Format**: Returns validation errors in a consistent format

### 4. Custom Exceptions (`src/common/exceptions/custom.exceptions.ts`)

Provides business-specific exceptions:

- **ResourceNotFoundException**: For missing resources
- **ResourceAlreadyExistsException**: For duplicate resources
- **InsufficientPermissionsException**: For permission violations
- **ValidationFailedException**: For validation errors
- **ResourceInUseException**: For resources that cannot be modified
- **InvalidOperationException**: For invalid business operations

## Error Response Format

All errors follow a consistent response format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "details": [
    {
      "field": "email",
      "value": "invalid-email",
      "constraints": {
        "isEmail": "email must be an email"
      }
    }
  ]
}
```

## Validation

### DTO Validation

All DTOs use Zod schemas for validation:

```typescript
export const CreateUserRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  isActive: z.boolean().default(true),
  centerId: z.string().optional(),
  roleId: z.string().optional(),
  scopeType: z.enum(['ADMIN', 'CENTER']).optional().default('ADMIN'),
});
```

### Validation Features:

- **Email Validation**: Ensures valid email format
- **String Length Validation**: Enforces minimum/maximum lengths
- **Enum Validation**: Restricts values to predefined options
- **Optional Fields**: Allows optional properties with defaults
- **Type Safety**: Provides TypeScript type safety

## Rate Limiting

The application implements rate limiting using `@nestjs/throttler`:

- **Default Limit**: 10 requests per minute
- **Test Environment**: 1000 requests per minute for testing
- **Global Protection**: Applied to all endpoints
- **429 Response**: Returns "Too Many Requests" for exceeded limits

## Logging

### Error Logging Features:

- **Structured Logging**: Uses Winston for structured log output
- **Context Information**: Includes request method, URL, user agent, IP
- **User Context**: Logs user ID when available
- **Stack Traces**: Includes full error stack traces
- **Error Classification**: Categorizes errors by type

### Log Format:

```json
{
  "level": "error",
  "message": "Error in POST /api/users: Validation failed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "context": {
    "method": "POST",
    "url": "/api/users",
    "userAgent": "Mozilla/5.0...",
    "ip": "127.0.0.1",
    "userId": "user-123"
  }
}
```

## Usage Examples

### Throwing Custom Exceptions:

```typescript
// Resource not found
throw new ResourceNotFoundException('User', userId);

// Resource already exists
throw new ResourceAlreadyExistsException('User', 'email', email);

// Insufficient permissions
throw new InsufficientPermissionsException('delete', 'user');

// Validation failed
throw new ValidationFailedException(validationErrors);

// Invalid operation
throw new InvalidOperationException('delete user', 'user is active');
```

### Handling Database Errors:

The error interceptor automatically handles common database errors:

- **Unique constraint violations** are converted to 409 Conflict responses
- **Foreign key violations** are converted to 400 Bad Request responses
- **Table not found errors** are converted to 500 Internal Server Error responses

### Validation Error Handling:

Validation errors are automatically processed and return detailed information:

- **Field names** that failed validation
- **Invalid values** that were provided
- **Constraint messages** explaining the validation failure

## Testing

The error handling system includes comprehensive tests:

- **Validation Error Tests**: Verify proper handling of invalid input
- **Authentication Error Tests**: Verify unauthorized access handling
- **Not Found Error Tests**: Verify missing resource handling
- **Rate Limiting Tests**: Verify rate limiting functionality
- **Error Format Tests**: Verify consistent error response format

## Best Practices

1. **Use Custom Exceptions**: Use the provided custom exceptions for business logic errors
2. **Validate Input**: Always validate input using DTOs with Zod schemas
3. **Log Errors**: Errors are automatically logged with context
4. **Handle Edge Cases**: Consider edge cases and provide appropriate error messages
5. **Test Error Scenarios**: Include error scenarios in your tests
6. **Consistent Format**: All errors follow the same response format

## Configuration

The error handling components are configured globally in `src/app.module.ts`:

```typescript
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: ErrorInterceptor,
  },
  {
    provide: APP_FILTER,
    useClass: HttpExceptionFilter,
  },
  {
    provide: APP_PIPE,
    useClass: CustomValidationPipe,
  },
];
```

This ensures that all endpoints benefit from the enhanced error handling and validation system.
