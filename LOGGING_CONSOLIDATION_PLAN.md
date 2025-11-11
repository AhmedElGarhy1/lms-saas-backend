# Logging Consolidation Plan

## Current State Analysis

### Issues Identified:

1. **Dual Logging Systems**: Winston (via LoggerService) + NestJS Logger (direct usage)
2. **Inconsistent Usage**: Some files use `new Logger()`, others use `LoggerService`
3. **Unnecessary Try-Catch**: Logging wrapped in try-catch blocks (logging should never fail)
4. **No Fault Tolerance**: LoggerService can throw errors
5. **Inconsistent Context**: Some logs have context, others don't
6. **Over-logging**: Logging everything instead of selective important events

## Solution: Unified, Fault-Tolerant Logging

### Principles:

1. **Single Source of Truth**: LoggerService only (no direct Winston/Logger usage)
2. **Never Fail**: Logging should never throw or break application flow
3. **Structured Logging**: Automatic context injection, consistent format
4. **Selective Logging**: Only log important events (errors, warnings, key business events)
5. **Module-Level Convenience**: Easy-to-use logger per module

## Implementation Plan

### Phase 1: Enhance LoggerService (Core)

- [ ] Make LoggerService fault-tolerant (wrap all calls in try-catch internally)
- [ ] Add automatic context extraction (service name, request ID)
- [ ] Add structured metadata support
- [ ] Add log level filtering
- [ ] Remove dependency on Winston throwing errors

### Phase 2: Create Module Logger Helper

- [ ] Create `createModuleLogger()` helper function
- [ ] Auto-inject service name as context
- [ ] Provide convenient methods: `logError()`, `logWarning()`, `logInfo()`, `logDebug()`
- [ ] Support structured metadata

### Phase 3: Replace Direct Logger Usage

- [ ] Replace all `new Logger()` with LoggerService
- [ ] Update 16 files using NestJS Logger directly
- [ ] Ensure consistent usage across codebase

### Phase 4: Remove Unnecessary Try-Catch

- [ ] Remove try-catch blocks around logging calls
- [ ] Trust LoggerService to handle errors internally
- [ ] Keep try-catch only for business logic, not logging

### Phase 5: Implement Selective Logging Strategy

- [ ] Document what should be logged:
  - ✅ Errors (always)
  - ✅ Warnings (important issues)
  - ✅ Key business events (start/end of critical operations)
  - ❌ Don't log: routine operations, debug info in production
- [ ] Add log level configuration per environment

### Phase 6: Add Request Context Integration

- [ ] Auto-inject request ID, user ID, center ID when available
- [ ] Use RequestContext for automatic metadata
- [ ] Make context optional (works in background jobs too)

## File Structure

```
src/shared/services/
  logger.service.ts          # Enhanced fault-tolerant logger
  logger.types.ts            # Types and interfaces
  logger.helpers.ts          # createModuleLogger() helper
```

## Usage Examples

### Before:

```typescript
// Inconsistent, can throw
private readonly logger = new Logger(MyService.name);

try {
  this.logger.log('Something happened');
} catch (error) {
  console.log('Logger failed');
}
```

### After:

```typescript
// Consistent, fault-tolerant, convenient
private readonly logger = createModuleLogger(MyService);

// No try-catch needed - logger handles errors internally
this.logger.logError(error, 'Operation failed', { userId, operationId });
this.logger.logInfo('Operation completed', { duration: 100 });
```

## Benefits

1. **Consistency**: Single logging approach across entire codebase
2. **Reliability**: Logging never breaks application flow
3. **Convenience**: Easy-to-use module-level logger
4. **Maintainability**: Centralized logging logic
5. **Performance**: Selective logging reduces overhead
6. **Observability**: Structured logs with automatic context

## Migration Strategy

1. Start with LoggerService enhancement (backward compatible)
2. Create helper function (new, doesn't break existing code)
3. Gradually migrate files (one module at a time)
4. Remove try-catch blocks (after migration)
5. Document logging guidelines

## Success Criteria

- ✅ No direct Winston/Logger usage
- ✅ All logging goes through LoggerService
- ✅ No try-catch blocks for logging
- ✅ Logging never throws errors
- ✅ Consistent log format across codebase
- ✅ Selective logging (not everything)
- ✅ Automatic context injection
