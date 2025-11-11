# Logging Guidelines

## Overview

We use a unified, fault-tolerant logging system based on Winston via `LoggerService`. Logging should never break application flow.

## When to Log

### ✅ DO Log:

1. **Errors** (always)
   - Exceptions and failures
   - Failed operations
   - System errors

2. **Warnings** (important issues)
   - Degraded functionality
   - Retry attempts
   - Rate limit hits
   - Missing optional data

3. **Key Business Events** (start/end of critical operations)
   - Notification delivery start/completion
   - User authentication
   - Critical state changes
   - Long-running operations

4. **Info** (important milestones)
   - Successful completion of important operations
   - Configuration changes
   - Service startup/shutdown

### ❌ DON'T Log:

1. **Routine Operations**
   - Every database query
   - Every HTTP request (unless error)
   - Every function call
   - Normal flow operations

2. **Debug Info in Production**
   - Detailed variable values
   - Step-by-step execution
   - Internal state dumps

3. **Sensitive Data**
   - Passwords
   - Tokens
   - Credit card numbers
   - Personal identifiable information (PII)

## Usage

### Basic Usage (Recommended)

```typescript
import { LoggerService } from '@/shared/services/logger.service';
import { createModuleLogger } from '@/shared/services/logger.helpers';

@Injectable()
export class MyService {
  private readonly logger = createModuleLogger(this, this.loggerService);

  constructor(private readonly loggerService: LoggerService) {}

  async someMethod() {
    // Log errors
    try {
      await riskyOperation();
    } catch (error) {
      this.logger.logError(error, 'Failed to perform operation', {
        userId,
        operationId,
      });
      throw error;
    }

    // Log warnings
    if (someCondition) {
      this.logger.logWarning('Degraded functionality', {
        reason: 'missing data',
      });
    }

    // Log important milestones
    this.logger.logInfo('Operation completed successfully', {
      duration: 100,
      itemsProcessed: 50,
    });

    // Debug (only in development)
    this.logger.logDebug('Processing item', { itemId });
  }
}
```

### Legacy Usage (Still Supported)

```typescript
// Direct LoggerService usage (backward compatible)
this.logger.error('Error message', stack, 'ServiceName', { metadata });
this.logger.warn('Warning message', 'ServiceName', { metadata });
this.logger.info('Info message', 'ServiceName', { metadata });
this.logger.debug('Debug message', 'ServiceName', { metadata });
```

## Best Practices

1. **Never wrap logging in try-catch** - LoggerService is fault-tolerant
2. **Use structured metadata** - Pass objects, not strings
3. **Include context** - userId, requestId, correlationId when available
4. **Be specific** - Clear, actionable log messages
5. **Log at appropriate level** - Error for errors, Warning for warnings, etc.
6. **Don't log sensitive data** - Never log passwords, tokens, PII

## Log Levels

- **error**: System errors, exceptions, failures
- **warn**: Warnings, degraded functionality, retries
- **info**: Important milestones, successful operations
- **debug**: Development debugging (filtered in production)
- **verbose**: Very detailed debugging (filtered in production)

## Automatic Context

LoggerService automatically injects:
- `requestId` - Request correlation ID
- `userId` - Current user ID (if available)
- `centerId` - Current center ID (if available)
- `ipAddress` - Client IP address
- `userAgent` - Client user agent
- `timestamp` - Log timestamp

You don't need to manually add these - they're added automatically when available.

## Examples

### Good Logging

```typescript
// ✅ Good: Specific error with context
this.logger.logError(error, 'Failed to send notification', {
  notificationId,
  userId,
  channel: 'EMAIL',
  retryCount: 3,
});

// ✅ Good: Warning with actionable info
this.logger.logWarning('Rate limit approaching', {
  userId,
  currentCount: 45,
  limit: 50,
  window: '1 minute',
});

// ✅ Good: Important milestone
this.logger.logInfo('Bulk notification completed', {
  total: 1000,
  success: 995,
  failed: 5,
  duration: 5000,
});
```

### Bad Logging

```typescript
// ❌ Bad: Too verbose, logs every operation
this.logger.logInfo('Processing user', { userId }); // Called 1000x per second

// ❌ Bad: Sensitive data
this.logger.logInfo('User logged in', {
  password: user.password, // NEVER!
  token: user.token, // NEVER!
});

// ❌ Bad: Unnecessary try-catch
try {
  this.logger.logInfo('Something happened');
} catch (error) {
  // LoggerService never throws - this is unnecessary
}

// ❌ Bad: Vague message
this.logger.logError(error, 'Error occurred'); // What error? Where?
```

## Migration from NestJS Logger

Replace:
```typescript
// Old
private readonly logger = new Logger(MyService.name);
this.logger.log('Message');
```

With:
```typescript
// New
private readonly logger = createModuleLogger(this, this.loggerService);
this.logger.logInfo('Message');
```

