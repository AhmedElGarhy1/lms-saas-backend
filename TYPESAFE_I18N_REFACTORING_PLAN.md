# Type-Safe I18n Refactoring Plan

## Overview

This plan outlines the migration from direct `I18nService.translate()` calls to the type-safe `TI18n` service throughout the codebase. This will provide compile-time type safety for translation arguments while maintaining backward compatibility.

## Goals

- ✅ Migrate all direct `I18nService.translate()` calls to `TI18n.t()`
- ✅ Maintain type safety for translation arguments
- ✅ Keep exception handling unchanged (as per original plan)
- ✅ Ensure backward compatibility during migration
- ✅ Improve developer experience with IntelliSense support

## Current State Analysis

### Files with Direct Translation Calls (To Migrate)

1. **Services:**
   - `src/modules/notifications/services/notification-template.service.ts` - 2 calls
   - `src/shared/utils/exception-translation.util.ts` - 2 utility functions (optional)

2. **Controllers:**
   - `src/modules/centers/controllers/centers-access.controller.ts` - 1 call

### Files to Leave Unchanged (Per Original Plan)

1. **Runtime Exception Handling:**
   - `src/shared/common/interceptors/translation-response.interceptor.ts` - Runtime exception translation
   - `src/shared/common/filters/global-exception.filter.ts` - Runtime exception translation

2. **Special Cases:**
   - `src/modules/locale/services/locale.service.ts` - Uses I18nService for loading translations, not direct calls

## Migration Strategy

### Phase 1: Identify and Catalog (Non-Breaking)

1. **Audit all files** with direct `I18nService.translate()` calls
2. **Document translation patterns** used in each file
3. **Identify argument types** needed for each translation key
4. **Create migration checklist** with file-by-file breakdown

### Phase 2: Migrate Services (Priority: High)

#### 2.1 NotificationTemplateService

**File:** `src/modules/notifications/services/notification-template.service.ts`

**Current Usage:**

```typescript
translatedTitle = this.i18nService.translate(titleKey, {
  lang: locale,
  args: data,
});
```

**Migration Steps:**

1. Replace `I18nService` injection with `TI18n`
2. Update `translate()` calls to use `tWithLang()` method
3. Ensure type safety for `data` arguments
4. Test notification rendering in all channels

**Expected Changes:**

- Replace `private readonly i18nService: I18nService` with `private readonly tI18n: TI18n`
- Update 2 translation calls in `renderJsonTemplate()` method
- Use `tWithLang()` for locale override support

#### 2.2 Exception Translation Utility (Optional)

**File:** `src/shared/utils/exception-translation.util.ts`

**Current Usage:**

```typescript
export function translateError(
  i18n: I18nService<I18nTranslations>,
  key: string,
  args?: Record<string, any>,
): string {
  return i18n.translate(key as any, { args });
}
```

**Decision:** Keep as-is or create type-safe version

- **Option A:** Keep current implementation (used for exceptions)
- **Option B:** Create `translateErrorTypeSafe()` that uses `TI18n`
- **Recommendation:** Keep as-is since it's used for exception handling

### Phase 3: Migrate Controllers (Priority: Medium)

#### 3.1 CentersAccessController

**File:** `src/modules/centers/controllers/centers-access.controller.ts`

**Current Usage:**

```typescript
message: this.i18n.translate(
  dto.isActive ? 't.success.userActivated' : 't.success.userDeactivated',
),
```

**Migration Steps:**

1. Replace `I18nService` injection with `TI18n`
2. Update translation call to use `t()` method
3. Verify no arguments needed for these keys
4. Test controller endpoints

**Expected Changes:**

- Replace `private readonly i18n: I18nService<I18nTranslations>` with `private readonly tI18n: TI18n`
- Update 1 translation call in `toggleUserStatus()` method

#### 3.2 Audit Other Controllers

**Action:** Search all controllers for direct `i18n.translate()` calls

- Most controllers use `ControllerResponse` which handles translations
- Focus on controllers with direct translation calls

### Phase 4: Update Utility Functions (Optional)

#### 4.1 Create Type-Safe Utility Functions

**New File:** `src/shared/utils/type-safe-i18n.util.ts`

**Purpose:** Provide type-safe utility functions for common translation patterns

**Functions to Create:**

```typescript
// Type-safe translation with resource name
export function tResource(
  tI18n: TI18n,
  key: I18nPath,
  resource: string,
): string;

// Type-safe translation with count
export function tCount(tI18n: TI18n, key: I18nPath, count: number): string;
```

### Phase 5: Testing and Validation

1. **Unit Tests:**
   - Test migrated services with type-safe translations
   - Verify type errors are caught at compile time
   - Test with missing/incorrect arguments

2. **Integration Tests:**
   - Test notification rendering with type-safe translations
   - Test controller responses with type-safe translations
   - Verify backward compatibility

3. **Type Safety Validation:**
   - Ensure all translation calls have correct argument types
   - Verify IntelliSense works correctly
   - Check for any type errors in migrated code

## Implementation Details

### Migration Pattern

**Before:**

```typescript
constructor(
  private readonly i18nService: I18nService<I18nTranslations>,
) {}

// Usage
const message = this.i18nService.translate('t.common.buttons.createResource', {
  args: { resource: 'User' },
});
```

**After:**

```typescript
constructor(
  private readonly tI18n: TI18n,
) {}

// Usage - Type-safe!
const message = this.tI18n.t('t.common.buttons.createResource', {
  resource: 'User',
});
```

### Handling Locale Overrides

**Before:**

```typescript
this.i18nService.translate(key, { lang: locale, args: data });
```

**After:**

```typescript
this.tI18n.tWithLang(key, data, locale);
```

### Type Safety Benefits

1. **Compile-time validation:**
   - TypeScript will error if required arguments are missing
   - IntelliSense will suggest available arguments
   - Type checking prevents runtime errors

2. **Example Error:**

```typescript
// ❌ Type Error: Property 'resource' is missing
this.tI18n.t('t.common.buttons.createResource', {});

// ✅ Correct
this.tI18n.t('t.common.buttons.createResource', { resource: 'User' });
```

## File-by-File Migration Checklist

### Services

- [ ] `src/modules/notifications/services/notification-template.service.ts`
  - [ ] Replace `I18nService` with `TI18n` in constructor
  - [ ] Update `renderJsonTemplate()` method (2 calls)
  - [ ] Test notification rendering
  - [ ] Verify type safety

### Controllers

- [ ] `src/modules/centers/controllers/centers-access.controller.ts`
  - [ ] Replace `I18nService` with `TI18n` in constructor
  - [ ] Update `toggleUserStatus()` method (1 call)
  - [ ] Test controller endpoint
  - [ ] Verify type safety

- [ ] Audit other controllers for direct translation calls
  - [ ] Search for `i18n.translate()` patterns
  - [ ] Migrate if found
  - [ ] Document findings

### Utilities (Optional)

- [ ] `src/shared/utils/exception-translation.util.ts`
  - [ ] Decision: Keep as-is or create type-safe version
  - [ ] Document decision

## Testing Strategy

### Unit Tests

1. **Service Tests:**
   - Test `NotificationTemplateService` with type-safe translations
   - Verify correct argument types are enforced
   - Test error handling for missing arguments

2. **Controller Tests:**
   - Test `CentersAccessController` with type-safe translations
   - Verify response messages are correctly translated

### Integration Tests

1. **Notification Flow:**
   - Test notification rendering with all channels
   - Verify translations work correctly
   - Test with different locales

2. **API Endpoints:**
   - Test controller endpoints that use type-safe translations
   - Verify responses are correctly translated

### Type Safety Tests

1. **Compile-time Validation:**
   - Verify TypeScript catches missing arguments
   - Verify IntelliSense suggests correct arguments
   - Test with incorrect argument types

## Rollback Plan

If issues arise during migration:

1. **Keep both services available:**
   - `TI18n` for new code
   - `I18nService` for legacy code

2. **Gradual migration:**
   - Migrate one file at a time
   - Test thoroughly before moving to next file

3. **Revert if needed:**
   - Each migration is independent
   - Can revert individual files if issues occur

## Success Criteria

- ✅ All direct `I18nService.translate()` calls migrated to `TI18n.t()`
- ✅ Type safety enforced for all translation arguments
- ✅ No runtime errors from missing translation arguments
- ✅ IntelliSense working correctly for translation calls
- ✅ All tests passing
- ✅ Backward compatibility maintained

## Timeline Estimate

- **Phase 1 (Audit):** 1-2 hours
- **Phase 2 (Services):** 2-3 hours
- **Phase 3 (Controllers):** 1-2 hours
- **Phase 4 (Utilities):** 1 hour (optional)
- **Phase 5 (Testing):** 2-3 hours

**Total:** 7-11 hours

## Notes

- Exception handling components remain unchanged (per original plan)
- Migration is non-breaking and can be done incrementally
- Type safety is enforced at compile time, preventing runtime errors
- IntelliSense support improves developer experience significantly
