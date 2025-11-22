# Remove Account Locking - Implementation Plan

## Overview
Complete removal of account locking functionality from the system. Rate limiting already provides protection, and account locking creates DoS vulnerabilities.

---

## Phase 1: Remove Lockout Logic from Auth Service

### Files to Modify:
1. **`src/modules/auth/services/auth.service.ts`**
   - Remove lockout check before password validation (lines 103-113)
   - Remove lockout event emission (lines 123-140)
   - Remove `incrementFailedAttempts` call (line 120-121)
   - Remove `resetFailedAttempts` call (line 163)
   - Remove `FailedLoginAttemptService` dependency
   - Remove `AccountLockedEvent` import

---

## Phase 2: Remove Lockout Check from JWT Strategy

### Files to Modify:
1. **`src/modules/auth/strategies/jwt.strategy.ts`**
   - Remove lockout check (lines 45-53)
   - Remove `FailedLoginAttemptService` dependency
   - Remove lockout-related exception

---

## Phase 3: Simplify Failed Login Attempt Service

### Files to Modify:
1. **`src/modules/auth/services/failed-login-attempt.service.ts`**
   - **Option A**: Delete entire service (if not used elsewhere)
   - **Option B**: Keep service but remove lockout logic (keep only tracking for analytics)
   - Remove `isLocked` return value
   - Remove `isLockedOut` method
   - Remove lockout threshold checks
   - Keep only attempt counting (for monitoring/analytics if needed)

**Decision**: Check if service is used elsewhere first, then decide.

---

## Phase 4: Remove Account Locked Event

### Files to Modify:
1. **`src/modules/auth/events/auth.events.ts`**
   - Remove `AccountLockedEvent` class (lines 160-168)

2. **`src/shared/events/auth.events.enum.ts`**
   - Remove `ACCOUNT_LOCKED = 'account.locked'` (line 17)

3. **`src/shared/events/event-type-map.ts`**
   - Remove `AccountLockedEvent` import (line 25)
   - Remove `[AuthEvents.ACCOUNT_LOCKED]: AccountLockedEvent` mapping (line 107)

---

## Phase 5: Remove Notification System for Account Locked

### Files to Delete:
1. **`src/modules/notifications/manifests/auth/account-locked.manifest.ts`** - DELETE

### Files to Modify:
1. **`src/modules/notifications/manifests/registry/notification-registry.ts`**
   - Remove `accountLockedManifest` import (line 9)
   - Remove `[NotificationType.ACCOUNT_LOCKED]: accountLockedManifest` (line 32)

2. **`src/modules/notifications/enums/notification-type.enum.ts`**
   - Remove `ACCOUNT_LOCKED = 'ACCOUNT_LOCKED'` (line 7)

3. **`src/modules/notifications/listeners/notification.listener.ts`**
   - Remove `AccountLockedEvent` import (line 16)
   - Remove `handleAccountLocked` method (lines 547-607)

4. **`src/modules/notifications/types/templates.generated.ts`**
   - Remove `'whatsapp/auth/account-locked'` and `'auth/account-locked'` from template paths

### Template Files to Delete:
1. **`src/i18n/notifications/en/in-app/auth/account-locked.json`** - DELETE
2. **`src/i18n/notifications/ar/in-app/auth/account-locked.json`** - DELETE
3. **`whatsapp-templates/en/auth/account-locked.txt`** - DELETE (if exists)
4. **`whatsapp-templates/ar/auth/account-locked.txt`** - DELETE (if exists)

---

## Phase 6: Remove Activity Logging for Account Locked

### Files to Modify:
1. **`src/modules/auth/enums/auth-activity-type.enum.ts`**
   - Remove `ACCOUNT_LOCKED = 'ACCOUNT_LOCKED'` (line 4)

2. **`src/modules/auth/listeners/auth.listener.ts`**
   - Remove `AccountLockedEvent` import (line 16)
   - Remove `handleAccountLocked` method (lines 144-156)

---

## Phase 7: Remove Configuration

### Files to Modify:
1. **`src/shared/config/config.ts`**
   - Remove `maxFailedLoginAttempts: 15` (line 62)
   - Remove `lockoutDurationMinutes: 30` (line 63)

2. **`src/shared/config/env.validation.ts`**
   - Check if these configs are defined here and remove if present

---

## Phase 8: Cleanup & Verification

### Tasks:
1. Search for any remaining references to:
   - `ACCOUNT_LOCKED`
   - `AccountLocked`
   - `account.*lock`
   - `lockout`
   - `maxFailedLoginAttempts`
   - `lockoutDurationMinutes`

2. Verify no broken imports
3. Run TypeScript compilation
4. Run linter
5. Check for unused imports

---

## Summary

### Files to Delete:
- `src/modules/notifications/manifests/auth/account-locked.manifest.ts`
- `src/i18n/notifications/en/in-app/auth/account-locked.json`
- `src/i18n/notifications/ar/in-app/auth/account-locked.json`
- WhatsApp template files (if exist)

### Files to Modify:
1. `src/modules/auth/services/auth.service.ts`
2. `src/modules/auth/strategies/jwt.strategy.ts`
3. `src/modules/auth/services/failed-login-attempt.service.ts` (simplify or delete)
4. `src/modules/auth/events/auth.events.ts`
5. `src/shared/events/auth.events.enum.ts`
6. `src/shared/events/event-type-map.ts`
7. `src/modules/notifications/manifests/registry/notification-registry.ts`
8. `src/modules/notifications/enums/notification-type.enum.ts`
9. `src/modules/notifications/listeners/notification.listener.ts`
10. `src/modules/auth/enums/auth-activity-type.enum.ts`
11. `src/modules/auth/listeners/auth.listener.ts`
12. `src/shared/config/config.ts`
13. `src/modules/notifications/types/templates.generated.ts` (may need regeneration)

---

## Notes

- **FailedLoginAttemptService**: Decide whether to keep for analytics or delete entirely
- **Rate limiting**: Already provides protection (5 attempts/minute)
- **No breaking changes**: This is internal functionality removal
- **Templates**: May need to regenerate template types after removal

