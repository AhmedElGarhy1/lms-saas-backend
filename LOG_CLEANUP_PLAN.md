# Log Cleanup Plan - Keep Only Failures, Warnings & Important Events

## Executive Summary

This plan removes unnecessary logs that create noise and focuses on logging only:
- **Actual failures** (system errors, exceptions, database failures)
- **Warnings** (security issues, permission denied, validation failures)
- **Important events** (not routine CRUD operations)

## Core Principles

### 1. "Not Found" is NOT an Error
- `ResourceNotFoundException` is normal business logic (404s are expected)
- Users querying non-existent resources is a normal use case
- Only log if it indicates a system problem (e.g., data corruption, missing required data)

### 2. Interceptors Already Handle Request Logging
- `PerformanceInterceptor` - logs all requests
- `TransactionPerformanceInterceptor` - logs transaction performance
- `ErrorInterceptor` - logs errors globally
- `DatabasePerformanceService` - tracks query performance
- **No need to duplicate this logging in services**

### 3. Activity Logs Handle Business Events
- `ActivityLogService` - logs all business events (user created, updated, etc.)
- **No need to log routine CRUD operations in services**

### 4. Log Only What Matters
- **Errors**: System failures, exceptions, database connection issues
- **Warnings**: Security issues, permission denied, validation failures, rate limits
- **Info**: System startup, critical configuration changes, important state changes

## What to Remove

### Category 1: "Not Found" Error Logs (Normal Business Logic)

These are expected business cases, not errors. Remove all error logs for:
- User not found
- Center not found
- Branch not found
- Role not found
- Profile not found
- Access not found

**Files to Clean:**
1. `src/modules/centers/services/centers.service.ts`
   - Line 53: `this.logger.error('Center not found', ...)`
   - **Action**: Remove - normal business case

2. `src/modules/centers/services/branches.service.ts`
   - Lines 48-52: `this.logger.error('Branch not found', ...)`
   - Lines 131-135: `this.logger.error('Branch toggle status failed - branch not found', ...)`
   - Lines 165-169: `this.logger.error('Branch restore failed - branch not found', ...)`
   - **Action**: Remove all - normal business cases

3. `src/modules/user/services/user.service.ts`
   - Lines 62-66: `this.logger.error('Password change failed - user not found', ...)`
   - Lines 224-228: `this.logger.error('User deletion failed - user not found', ...)`
   - Lines 258-262: `this.logger.error('User restore failed - user not found', ...)`
   - Lines 310-314: `this.logger.error('User activation failed - user not found', ...)`
   - Lines 353-357: `this.logger.error('Profile activation failed - user profile not found', ...)`
   - Lines 430-434: `this.logger.error('Find user by profile failed - user profile not found', ...)`
   - Lines 447-451: `this.logger.error('Update failed login attempts failed - user profile not found', ...)`
   - Lines 467-471: `this.logger.error('Update lockout failed - user profile not found', ...)`
   - Lines 489-493: `this.logger.error('Update 2FA failed - user profile not found', ...)`
   - Lines 528-532: `this.logger.error('Update user by profile failed - user profile not found', ...)`
   - **Action**: Remove all - normal business cases

4. `src/modules/admin/services/admin.service.ts`
   - Lines 81-85: `this.logger.error('Admin deletion failed - user profile not found', ...)`
   - Lines 109-113: `this.logger.error('Admin restore failed - user profile not found', ...)`
   - Lines 138-142: `this.logger.error('Find admin failed - user not found', ...)`
   - **Action**: Remove all - normal business cases

5. `src/modules/staff/services/staff.service.ts`
   - Lines 154-158: `this.logger.error('Find staff failed - user not found', ...)`
   - **Action**: Remove - normal business case

6. `src/modules/access-control/services/roles.service.ts`
   - Lines 71-75: `this.logger.error('Role update failed - role not found', ...)`
   - Lines 107-111: `this.logger.error('Role deletion failed - role not found', ...)`
   - Lines 180-184: `this.logger.error('Role restore failed - role not found', ...)`
   - **Action**: Remove all - normal business cases

7. `src/modules/access-control/services/access-control.service.ts`
   - Lines 266-274: `this.logger.error('Remove center access failed - center access not found', ...)`
   - Lines 302-310: `this.logger.error('Restore center access failed - center access not found', ...)`
   - Lines 336-344: `this.logger.error('Activate center access failed - center access not found', ...)`
   - **Action**: Remove all - normal business cases

8. `src/modules/auth/services/auth.service.ts`
   - Lines 189-193: `this.logger.error('2FA verification failed - user not found', ...)` - **KEEP** (security context)
   - Lines 301-305: `this.logger.error('Email verification request failed - user not found', ...)` - **REMOVE**
   - Lines 342-346: `this.logger.error('Phone verification request failed - user not found', ...)` - **REMOVE**
   - Lines 391-395: `this.logger.error('Phone verification failed - user not found after verification', ...)` - **REMOVE**
   - Lines 508-512: `this.logger.error('2FA setup failed - user not found', ...)` - **REMOVE**
   - Lines 571-575: `this.logger.error('2FA enable failed - user not found', ...)` - **REMOVE**
   - Lines 639-643: `this.logger.error('2FA disable failed - user not found', ...)` - **REMOVE**
   - Lines 742-746: `this.logger.error('Token refresh failed - user not found', ...)` - **KEEP** (security context)

9. `src/modules/auth/listeners/auth.listener.ts`
   - Lines 29-33: `this.logger.error('User logged out event handling failed - user not found', ...)` - **REMOVE**
   - Lines 66-70: `this.logger.error('Token refreshed event handling failed - user not found', ...)` - **REMOVE**
   - **Action**: Remove - normal case when building actor from user

### Category 2: Routine Operation Success Logs

These are already logged by activity logs or interceptors. Remove:
- Password change success
- User creation success
- User update success
- Center update success
- All routine CRUD operation success logs

**Files to Clean:**
1. `src/modules/user/services/user.service.ts`
   - Line 95: `this.logger.log('Password changed for user: ${userId}')` - **REMOVE**
   - Line 215: `this.logger.log('User deleted: ${userId} by ${actor.userProfileId}')` - **REMOVE** (activity log handles this)
   - Lines 322-324: `this.logger.log('User activation status updated...')` - **REMOVE** (activity log handles this)

2. `src/modules/centers/services/centers.service.ts`
   - Lines 87-89: `this.logger.info('Updating center...')` - **REMOVE** (interceptor handles this)
   - Lines 127-129: `this.logger.info('Deleting center...')` - **REMOVE** (interceptor handles this)
   - Lines 159-161: `this.logger.info('Restoring center...')` - **REMOVE** (interceptor handles this)
   - Lines 175-177: `this.logger.info('Center activation updated...')` - **KEEP** (important state change)
   - Lines 191-192: `this.logger.info('Clearing all centers for seeding...')` - **KEEP** (important operation)
   - Lines 196-197: `this.logger.info('Creating center for seeding...')` - **KEEP** (important operation)
   - Lines 201-202: `this.logger.info('Center created for seeding...')` - **REMOVE** (routine operation)

### Category 3: Duplicate Warning Logs

Some warnings are redundant or too verbose. Review and remove:
- Duplicate permission warnings (already handled by exceptions)
- Validation warnings that are already in exception messages

**Files to Review:**
1. `src/modules/user/services/user.service.ts`
   - Lines 76-80: `this.logger.warn('Password change failed - invalid current password', ...)` - **KEEP** (security warning)
   - Lines 104-108: `this.logger.warn('User creation failed - email already exists', ...)` - **REMOVE** (normal business case)
   - Lines 117-121: `this.logger.warn('User creation failed - phone already exists', ...)` - **REMOVE** (normal business case)
   - Lines 236-240: `this.logger.warn('User deletion failed - insufficient permissions', ...)` - **KEEP** (security warning)
   - Lines 270-274: `this.logger.warn('User restore failed - insufficient permissions', ...)` - **KEEP** (security warning)

2. `src/modules/centers/services/centers.service.ts`
   - Lines 106-110: `this.logger.warn('Center update failed - duplicate center name', ...)` - **REMOVE** (normal business case)

3. `src/modules/access-control/services/roles.service.ts`
   - Lines 79-83: `this.logger.warn('Role update failed - insufficient permissions', ...)` - **KEEP** (security warning)
   - Lines 115-119: `this.logger.warn('Role deletion failed - insufficient permissions', ...)` - **KEEP** (security warning)
   - Lines 190-194: `this.logger.warn('Role restore attempted for active role', ...)` - **REMOVE** (normal business case)

4. `src/modules/access-control/services/access-control.service.ts`
   - Lines 67-75: `this.logger.warn('Grant user access failed - no access to granter user', ...)` - **KEEP** (security warning)
   - Lines 79-87: `this.logger.warn('Grant user access failed - no access to target user', ...)` - **KEEP** (security warning)
   - Lines 106-114: `this.logger.warn('Grant user access failed - access already exists', ...)` - **REMOVE** (normal business case)
   - Lines 136-144: `this.logger.warn('Revoke user access failed - no access to granter user', ...)` - **KEEP** (security warning)
   - Lines 158-166: `this.logger.warn('Revoke user access failed - no access to target user', ...)` - **KEEP** (security warning)
   - Lines 176-184: `this.logger.warn('Revoke user access failed - access does not exist', ...)` - **REMOVE** (normal business case)
   - Lines 231-240: `this.logger.warn('Assign profile to branch failed - already assigned', ...)` - **REMOVE** (normal business case)
   - Lines 278-286: `this.logger.warn('Remove center access attempted for already deleted access', ...)` - **REMOVE** (normal business case)
   - Lines 314-322: `this.logger.warn('Restore center access attempted for active access', ...)` - **REMOVE** (normal business case)

5. `src/modules/access-control/services/access-control-helper.service.ts`
   - Lines 82-86: `this.logger.warn('Admin access validation failed', ...)` - **KEEP** (security warning)
   - Lines 209-217: `this.logger.warn('User access validation failed', ...)` - **KEEP** (security warning)
   - Lines 265-272: `this.logger.warn('Center access validation failed', ...)` - **KEEP** (security warning)
   - Lines 280-287: `this.logger.warn('Center access validation failed - access is inactive', ...)` - **KEEP** (important state)
   - Lines 263-270: `this.logger.warn('Center access validation failed - center is inactive', ...)` - **KEEP** (important state)
   - Lines 311-319: `this.logger.warn('Branch access validation failed', ...)` - **KEEP** (security warning)

6. `src/modules/admin/services/admin.service.ts`
   - Lines 68-72: `this.logger.warn('Admin deletion failed - insufficient permissions', ...)` - **KEEP** (security warning)
   - Lines 96-100: `this.logger.warn('Admin restore failed - insufficient permissions', ...)` - **KEEP** (security warning)

7. `src/modules/staff/services/staff.service.ts`
   - Lines 65-69: `this.logger.warn('Staff deletion failed - insufficient permissions', ...)` - **KEEP** (security warning)
   - Lines 83-87: `this.logger.warn('Staff restore failed - insufficient permissions', ...)` - **KEEP** (security warning)
   - Lines 99-103: `this.logger.warn('Delete staff access failed - no center ID', ...)` - **KEEP** (validation warning)
   - Lines 124-128: `this.logger.warn('Restore staff access failed - no center ID', ...)` - **KEEP** (validation warning)

8. `src/modules/auth/services/auth.service.ts`
   - Lines 198-202: `this.logger.warn('2FA verification attempted for user without 2FA enabled', ...)` - **KEEP** (security warning)
   - Lines 310-314: `this.logger.warn('Email verification requested for user without email', ...)` - **REMOVE** (normal validation)
   - Lines 353-357: `this.logger.warn('Phone verification requested for user without phone', ...)` - **REMOVE** (normal validation)
   - Lines 517-521: `this.logger.warn('2FA setup attempted for user with 2FA already enabled', ...)` - **REMOVE** (normal business case)
   - Lines 580-584: `this.logger.warn('2FA enable attempted for user with 2FA already enabled', ...)` - **REMOVE** (normal business case)
   - Lines 591-595: `this.logger.warn('2FA enable attempted without setup', ...)` - **REMOVE** (normal validation)
   - Lines 648-652: `this.logger.warn('2FA disable attempted for user without 2FA enabled', ...)` - **REMOVE** (normal business case)

## What to Keep

### Errors (Actual System Failures)

Keep error logs for:
- Database connection failures
- External service failures (email, SMS providers)
- System exceptions (unexpected errors)
- Transaction failures
- Query execution failures
- Security-related failures (authentication, authorization)

**Examples to Keep:**
1. `src/modules/auth/services/auth.service.ts`
   - Lines 78-80: `this.logger.warn('Failed login attempt...')` - **KEEP** (security)
   - Lines 103-103: `this.logger.warn('Login attempt for inactive user...')` - **KEEP** (security)
   - Lines 113-113: `this.logger.warn('Login attempt for locked user...')` - **KEEP** (security)
   - Lines 218-222: `this.logger.error('Invalid 2FA code provided', ...)` - **KEEP** (security failure)
   - Lines 259-264: `this.logger.error('Email verification failed - invalid or expired token', ...)` - **KEEP** (system failure)
   - Lines 379-384: `this.logger.error('Phone verification failed - invalid or expired code', ...)` - **KEEP** (system failure)
   - Lines 489-494: `this.logger.error('Password reset failed', ...)` - **KEEP** (system failure)
   - Lines 505-506: `this.logger.error('Invalid 2FA verification code for enable', ...)` - **KEEP** (security failure)
   - Lines 666-670: `this.logger.error('Invalid 2FA verification code for disable', ...)` - **KEEP** (security failure)

2. `src/modules/user/services/user.service.ts`
   - Lines 76-80: `this.logger.warn('Password change failed - invalid current password', ...)` - **KEEP** (security warning)
   - Lines 236-240: `this.logger.warn('User deletion failed - insufficient permissions', ...)` - **KEEP** (security warning)
   - Lines 270-274: `this.logger.warn('User restore failed - insufficient permissions', ...)` - **KEEP** (security warning)

3. `src/modules/access-control/services/roles.service.ts`
   - Lines 79-83: `this.logger.warn('Role update failed - insufficient permissions', ...)` - **KEEP** (security warning)
   - Lines 115-119: `this.logger.warn('Role deletion failed - insufficient permissions', ...)` - **KEEP** (security warning)

4. `src/modules/access-control/listeners/role.listener.ts`
   - Lines 45-50: `this.logger.error('Failed to assign role', ...)` - **KEEP** (system failure)
   - Lines 77-82: `this.logger.error('Failed to revoke role', ...)` - **KEEP** (system failure)
   - Lines 144-149: `this.logger.error('Failed to handle assign owner event', ...)` - **KEEP** (system failure)
   - Lines 179-184: `this.logger.error('Failed to remove profiles from deleted role', ...)` - **KEEP** (system failure)

5. `src/modules/access-control/listeners/user-access.listener.ts`
   - Lines 34-39: `this.logger.error('Failed to grant user access', ...)` - **KEEP** (system failure)
   - Lines 69-74: `this.logger.error('Failed to revoke user access', ...)` - **KEEP** (system failure)

6. `src/modules/access-control/listeners/center-access.listener.ts`
   - Lines 34-39: `this.logger.error('Failed to grant center access', ...)` - **KEEP** (system failure)
   - Lines 66-71: `this.logger.error('Failed to revoke center access', ...)` - **KEEP** (system failure)

7. `src/modules/auth/listeners/auth.listener.ts`
   - Lines 43-48: `this.logger.error('User logged out event handling failed', ...)` - **KEEP** (system failure in listener)
   - Lines 80-85: `this.logger.error('Token refreshed event handling failed', ...)` - **KEEP** (system failure in listener)

### Warnings (Security & Degraded Functionality)

Keep warning logs for:
- Permission denied attempts (security)
- Authentication failures (security)
- Invalid credentials (security)
- Rate limit exceeded (security/monitoring)
- Validation failures (security-related)
- Invalid operations (security)

**Examples to Keep:**
- All permission denied warnings
- All authentication failure warnings
- All invalid credential warnings
- Rate limit warnings
- Security-related validation failures

### Important Events

Keep info logs for:
- System startup/shutdown
- Critical configuration changes
- Security events (login failures, suspicious activity)
- Circuit breaker state changes
- Job failures
- Important state changes (center activation, etc.)

**Examples to Keep:**
1. `src/modules/centers/services/centers.service.ts`
   - Lines 175-177: `this.logger.info('Center activation updated...')` - **KEEP** (important state change)
   - Lines 191-192: `this.logger.info('Clearing all centers for seeding...')` - **KEEP** (important operation)
   - Lines 196-197: `this.logger.info('Creating center for seeding...')` - **KEEP** (important operation)

2. `src/modules/notifications/services/template-hot-reload.service.ts`
   - Lines 38-42: `this.logger.info('Template hot reload enabled', ...)` - **KEEP** (important configuration)

3. `src/modules/notifications/jobs/redis-cleanup.job.ts`
   - Lines 103-111: `this.logger.info('Redis cleanup job completed', ...)` - **KEEP** (only when cleanup happened)

4. `src/modules/notifications/jobs/notification-dlq-cleanup.job.ts`
   - Lines 208-220: `this.logger.info('DLQ cleanup job completed', ...)` - **KEEP** (only when cleanup happened)

## Implementation Steps

### Phase 1: Remove "Not Found" Error Logs
1. Remove all `logger.error('...not found', ...)` calls
2. Keep the exception throwing (that's the business logic)
3. Files: centers, branches, user, admin, staff, roles, access-control services

### Phase 2: Remove Routine Operation Logs
1. Remove success logs for routine CRUD operations
2. Keep only important state changes
3. Files: user, centers services

### Phase 3: Clean Up Duplicate Warnings
1. Remove warnings for normal business cases (duplicates, already exists, etc.)
2. Keep security-related warnings
3. Files: access-control, auth, admin, staff services

### Phase 4: Review Listener Logs
1. Remove "not found" logs from listeners (normal case)
2. Keep actual system failure logs in listeners
3. Files: auth.listener.ts

### Phase 5: Final Review
1. Verify no "not found" error logs remain
2. Verify security warnings are kept
3. Verify important events are kept
4. Test that interceptors still log requests properly

## Summary Statistics

**Estimated Logs to Remove:**
- ~40 "not found" error logs
- ~10 routine operation success logs
- ~15 duplicate/normal business case warnings

**Estimated Logs to Keep:**
- ~30 security warnings (permission denied, auth failures)
- ~20 system failure errors
- ~10 important event info logs

**Result:**
- Remove ~65 unnecessary logs
- Keep ~60 essential logs
- **Net reduction: ~65 logs removed, cleaner codebase**

## Testing Checklist

After cleanup, verify:
- [ ] No "not found" error logs in production logs
- [ ] Security warnings still appear (permission denied, auth failures)
- [ ] System failures still logged (database errors, external service failures)
- [ ] Important events still logged (state changes, job completions)
- [ ] Interceptors still log requests properly
- [ ] Activity logs still capture business events
- [ ] No duplicate logging between services and interceptors

