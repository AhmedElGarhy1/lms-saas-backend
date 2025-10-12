# Exception Handling & Response Standardization

This document outlines the standardized approach for exception handling and response formatting across the entire application.

## 🎯 Overview

We have implemented a comprehensive exception handling system that provides:

- **Consistent error responses** across all endpoints
- **User-friendly error messages** with actionable guidance
- **Structured error details** for debugging
- **Automatic response wrapping** for success cases
- **Standardized API documentation** with Swagger

## 🏗️ Architecture

### 1. Global Exception Filter

- **File**: `src/shared/common/filters/global-exception.filter.ts`
- **Purpose**: Catches all exceptions and converts them to standardized format
- **Features**:
  - Converts NestJS built-in exceptions to our custom format
  - Handles unexpected errors gracefully
  - Provides user-friendly messages
  - Logs errors with context

### 2. Response Interceptor

- **File**: `src/shared/common/interceptors/response.interceptor.ts`
- **Purpose**: Wraps all successful responses in standard format
- **Features**:
  - Adds metadata (timestamp, request ID, processing time)
  - Handles paginated responses
  - Provides consistent success messages

### 3. Custom Exception Classes

- **File**: `src/shared/common/exceptions/custom.exceptions.ts`
- **Purpose**: Domain-specific exceptions with structured responses

## 📋 Standard Exception Classes

### Core Exceptions

```typescript
// Resource not found
throw new ResourceNotFoundException('User not found');

// Authentication failed
throw new AuthenticationFailedException('Invalid credentials');

// Access denied
throw new AccessDeniedException('Insufficient permissions');

// Business logic violations
throw new BusinessLogicException(
  'Account is deactivated',
  'Your account has been deactivated',
  'Please contact an administrator to reactivate your account',
);

// Resource conflicts
throw new UserAlreadyExistsException('user@example.com');

// Validation errors
throw new ValidationFailedException('Validation failed', [
  {
    field: 'email',
    value: 'invalid-email',
    message: 'Invalid email format',
    code: 'INVALID_EMAIL',
    suggestion: 'Please enter a valid email address',
  },
]);

// Service unavailable
throw new ServiceUnavailableException('Database connection failed');
```

## 🎨 Standard Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    /* actual data */
  },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123def",
    "version": "1.0.0",
    "processingTime": 150
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [
    /* array of items */
  ],
  "message": "Data retrieved successfully",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123def",
    "version": "1.0.0",
    "processingTime": 200
  }
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "userMessage": "Please check your input and try again",
  "actionRequired": "Fix the highlighted errors below",
  "retryable": true,
  "details": [
    {
      "field": "email",
      "value": "invalid-email",
      "message": "Invalid email format",
      "code": "INVALID_EMAIL",
      "suggestion": "Please enter a valid email address"
    }
  ]
}
```

## 🎯 Controller Usage

### Using Standard API Response Decorators

```typescript
import {
  CreateApiResponses,
  ReadApiResponses,
  UpdateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';

@Controller('users')
export class UserController {
  @Post()
  @CreateApiResponses('Create a new user')
  @ApiBody({ type: CreateUserDto })
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @Get()
  @ReadApiResponses('List users with pagination')
  async listUsers(@Query() query: PaginateUsersDto) {
    return this.userService.paginateUsers(query);
  }

  @Put(':id')
  @UpdateApiResponses('Update user information')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(id, dto);
  }

  @Delete(':id')
  @DeleteApiResponses('Delete a user')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
```

### Custom API Responses

```typescript
import { StandardApiResponses } from '@/shared/common/decorators';

@Post('custom-action')
@StandardApiResponses({
  summary: 'Perform custom action',
  description: 'This endpoint performs a custom business operation',
  successMessage: 'Custom action completed successfully',
  includeValidation: true,
  includeAuth: true,
  includeNotFound: false,
  includeConflict: true
})
async customAction(@Body() dto: CustomActionDto) {
  return this.service.performCustomAction(dto);
}
```

## 🔧 Service Layer Usage

### Throwing Standard Exceptions

```typescript
import {
  ResourceNotFoundException,
  BusinessLogicException,
  UserAlreadyExistsException,
} from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class UserService {
  async findUser(id: string) {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }
    return user;
  }

  async createUser(dto: CreateUserDto) {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new UserAlreadyExistsException(dto.email);
    }

    if (dto.age < 18) {
      throw new BusinessLogicException(
        'User must be at least 18 years old',
        'You must be at least 18 years old to create an account',
        'Please provide a valid date of birth',
      );
    }

    return this.userRepository.create(dto);
  }
}
```

## 📊 HTTP Status Code Mapping

| Exception Class                  | HTTP Status | Use Case                           |
| -------------------------------- | ----------- | ---------------------------------- |
| `ResourceNotFoundException`      | 404         | Entity not found                   |
| `AuthenticationFailedException`  | 401         | Invalid credentials                |
| `AccessDeniedException`          | 403         | Insufficient permissions           |
| `BusinessLogicException`         | 400         | Business rule violations           |
| `ValidationFailedException`      | 400         | Input validation errors            |
| `UserAlreadyExistsException`     | 409         | Duplicate user creation            |
| `ResourceAlreadyExistsException` | 409         | Duplicate resource creation        |
| `ResourceInUseException`         | 409         | Resource cannot be modified        |
| `InvalidOperationException`      | 400         | Invalid operation attempts         |
| `PasswordTooWeakException`       | 400         | Password doesn't meet requirements |
| `ServiceUnavailableException`    | 503         | External service failures          |

## 🎨 Error Message Guidelines

### User-Friendly Messages

- **Clear and actionable**: Tell users what they need to do
- **Non-technical**: Avoid technical jargon
- **Helpful**: Provide guidance on how to fix the issue

### Examples

```typescript
// ❌ Bad
throw new BusinessLogicException('User entity validation failed');

// ✅ Good
throw new BusinessLogicException(
  'User must be at least 18 years old',
  'You must be at least 18 years old to create an account',
  'Please provide a valid date of birth',
);
```

## 🔍 Debugging

### Error Logging

All exceptions are automatically logged with:

- Request context (method, URL, user agent, IP)
- Error details
- Stack trace (for unexpected errors)
- Request ID for tracking

### Request Tracking

Each request gets a unique ID that can be used to:

- Track requests across services
- Correlate logs
- Debug issues in production

## 🚀 Benefits

1. **Consistency**: All endpoints return the same response format
2. **User Experience**: Clear, actionable error messages
3. **Developer Experience**: Easy to use decorators and exceptions
4. **Maintainability**: Centralized exception handling logic
5. **Documentation**: Automatic Swagger documentation
6. **Debugging**: Comprehensive logging and request tracking
7. **Monitoring**: Structured error data for monitoring tools

## 📝 Migration Guide

### From Old Exception Handling

```typescript
// ❌ Old way
@ApiOperation({ summary: 'Create user' })
@ApiResponse({ status: 201, description: 'User created' })
@ApiResponse({ status: 400, description: 'Bad request' })
@ApiResponse({ status: 409, description: 'User exists' })
async createUser(@Body() dto: CreateUserDto) {
  if (await this.userExists(dto.email)) {
    throw new ConflictException('User already exists');
  }
  return this.userService.create(dto);
}

// ✅ New way
@CreateApiResponses('Create a new user')
async createUser(@Body() dto: CreateUserDto) {
  if (await this.userExists(dto.email)) {
    throw new UserAlreadyExistsException(dto.email);
  }
  return this.userService.create(dto);
}
```

This standardization ensures consistent, user-friendly, and maintainable exception handling across the entire application.
