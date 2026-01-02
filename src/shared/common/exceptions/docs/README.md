# Error Handling Architecture

This document explains the clean, simple, and effective error handling system implemented in the LMS backend.

## 🎯 Architecture Overview

The error system follows a **layered architecture** that separates concerns while maintaining type safety and simplicity.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Error Codes   │ -> │  Error Helpers   │ -> │   HTTP Response │
│   (Enums)       │    │  (Static Classes)│    │   (JSON)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🏗️ Layers Explained

### 1. Error Codes Layer (`src/modules/*/enums/*.codes.ts`)

**Purpose**: Define unique identifiers for each error type across the system.

**Structure**:

```typescript
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'AUTH_002',
  ACCOUNT_DISABLED = 'AUTH_004',
  OTP_REQUIRED = 'AUTH_009',
  // ... more codes
}
```

**Benefits**:

- **Namespaced**: `AUTH_`, `USR_`, `FIN_` prefixes prevent conflicts
- **Sequential**: Easy to add new codes without breaking existing ones
- **Searchable**: Error codes make logs and debugging easier

### 2. Error Helpers Layer (`src/modules/*/exceptions/*.errors.ts`)

**Purpose**: Provide clean, typed methods for creating errors with appropriate context.

**Structure**:

```typescript
export class AuthErrors extends BaseErrorHelpers {
  // Errors without additional data
  static invalidCredentials(): DomainException {
    return this.createNoDetails(AuthErrorCode.INVALID_CREDENTIALS);
  }

  // Errors with context data
  static otpRequired(
    type: 'login' | 'setup' | 'disable' = 'login',
  ): DomainException {
    return this.createWithDetails(AuthErrorCode.OTP_REQUIRED, { type });
  }
}
```

**Benefits**:

- **Type-safe**: TypeScript enforces correct method calls
- **Consistent API**: All modules follow the same patterns
- **Readable**: Method names clearly indicate error conditions
- **Maintainable**: Easy to add new errors or modify existing ones

### 3. Domain Exception Layer (`src/shared/common/exceptions/domain.exception.ts`)

**Purpose**: Core exception class that creates standardized HTTP responses.

**Structure**:

```typescript
export class DomainException extends HttpException {
  constructor(
    public readonly errorCode: AllErrorCodes,
    public readonly details?: any[],
  ) {
    super(
      {
        errorCode, // Frontend identifier
        type: 'domain_error', // Error category
        timestamp: new Date().toISOString(), // When error occurred
        ...(details && details.length > 0 && { details }), // Optional context
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
```

**Benefits**:

- **HTTP Standard**: Returns proper 400 Bad Request responses
- **Structured**: Consistent JSON format for all errors
- **Framework Integration**: Works seamlessly with NestJS exception filters

## 🔄 Error Flow

### 1. Service Logic

```typescript
// Business logic detects error condition
if (!user.isActive) {
  throw AuthErrors.accountDisabled(); // Create typed error
}
```

### 2. Exception Creation

```typescript
// AuthErrors.accountDisabled() creates:
new DomainException('AUTH_004', []);
// Which generates HTTP response:
// {
//   "statusCode": 400,
//   "errorCode": "AUTH_004",
//   "type": "domain_error",
//   "timestamp": "2024-01-01T12:00:00.000Z",
//   "details": []
// }
```

### 3. Global Exception Filter

```typescript
// Catches DomainException
// Logs appropriate level (warn for business errors)
// Returns structured JSON to frontend
```

### 4. Frontend Handling

```typescript
// Frontend checks errorCode and handles appropriately
if (error.errorCode === 'AUTH_004') {
  showMessage('Account is disabled. Contact administrator.');
}
```

## 🎯 Design Principles

### ✅ What We Prioritize

- **Simplicity**: Easy to understand and maintain
- **Type Safety**: Compile-time error prevention
- **Consistency**: Same patterns across all modules
- **Performance**: Minimal runtime overhead
- **Debugging**: Clear error codes and structured data

### ❌ What We Avoid

- **Over-engineering**: Complex type systems that slow development
- **Runtime Validation**: String-based type checking
- **Manual Contracts**: Complex frontend-backend agreements
- **Code Generation**: Unnecessary build-time complexity
- **Generic Solutions**: One-size-fits-all approaches that add complexity

## 📁 File Organization

```
src/
├── shared/common/
│   ├── enums/error-codes/
│   │   ├── index.ts              # Union types and exports
│   │   └── common.codes.ts       # Common error codes
│   └── exceptions/
│       ├── domain.exception.ts   # Core exception classes
│       └── system.exception.ts   # System-level errors (500s)
│
├── modules/
│   ├── auth/
│   │   ├── enums/auth.codes.ts      # AUTH_xxx error codes
│   │   └── exceptions/auth.errors.ts # AuthErrors helper class
│   │
│   ├── user/
│   │   ├── enums/user.codes.ts      # USR_xxx error codes
│   │   └── exceptions/user.errors.ts # UserErrors helper class
│   │
│   └── finance/
│       ├── enums/finance.codes.ts      # FIN_xxx error codes
│       └── exceptions/finance.errors.ts # FinanceErrors helper class
```

## 🚀 Adding New Errors

### 1. Add Error Code

```typescript
// src/modules/auth/enums/auth.codes.ts
export enum AuthErrorCode {
  // ... existing codes
  EMAIL_NOT_VERIFIED = 'AUTH_027', // Add new code
}
```

### 2. Add Helper Method

```typescript
// src/modules/auth/exceptions/auth.errors.ts
export class AuthErrors extends BaseErrorHelpers {
  // ... existing methods
  static emailNotVerified(): DomainException {
    return this.createNoDetails(AuthErrorCode.EMAIL_NOT_VERIFIED);
  }
}
```

### 3. Update Documentation

```markdown
<!-- src/shared/common/exceptions/docs/errors-reference.md -->

### AUTH_027: EMAIL_NOT_VERIFIED

**Description**: User email address is not verified
**Parameters**: None
**Details**: Empty array
**Frontend Message**: "Please verify your email address before proceeding"
```

### 4. Use in Services

```typescript
// src/modules/auth/services/auth.service.ts
if (!user.emailVerified) {
  throw AuthErrors.emailNotVerified();
}
```

## 🎯 Error Categories

### Domain Errors (400) - Business Logic

- User input errors (invalid credentials, missing data)
- Business rule violations (insufficient funds, permissions)
- State errors (account disabled, email not verified)

### System Errors (500) - Infrastructure

- Database connection failures
- External service timeouts
- Unexpected server errors

## 🔍 Debugging & Monitoring

### Error Codes in Logs

```json
{
  "level": "warn",
  "message": "Domain error: AUTH_002",
  "code": "AUTH_002",
  "details": [],
  "path": "/api/auth/login",
  "userId": "user123"
}
```

### Frontend Error Tracking

```typescript
// Track error patterns
analytics.track('error_occurred', {
  errorCode: error.errorCode,
  path: window.location.pathname,
  userAgent: navigator.userAgent,
});
```

## 📊 Benefits Summary

| **Aspect**               | **Benefit**                      |
| ------------------------ | -------------------------------- |
| **Type Safety**          | Compile-time error prevention    |
| **Consistency**          | Same patterns across all modules |
| **Maintainability**      | Easy to add/modify errors        |
| **Debugging**            | Clear error codes in logs        |
| **Frontend Integration** | Structured JSON responses        |
| **Performance**          | Minimal overhead                 |
| **Developer Experience** | IntelliSense and autocomplete    |

## 🎉 Conclusion

This error architecture strikes the perfect balance between **simplicity** and **effectiveness**. It provides type safety, consistency, and maintainability without over-engineering or complexity.

The system is **production-ready** and **scalable** - perfect for your Egyptian LMS! 🇪🇬📚✨
