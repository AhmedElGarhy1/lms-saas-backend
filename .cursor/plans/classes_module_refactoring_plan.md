# Classes Module Refactoring Plan

## Overview

This plan addresses code quality improvements for the classes module, following the same refactoring patterns successfully applied to the groups module. The refactoring focuses on eliminating redundant validations, fixing inefficient queries, consolidating DTOs, and improving maintainability.

## Code Quality Improvements

### 1. Fix Inefficient Query Patterns

**1.1 Fix `updateClass()` double fetch**

**File**: `src/modules/classes/services/classes.service.ts` (method: `updateClass`)

**Current issue**: Fetches class twice (line 165: `findOneOrThrow`, line 203: `findClassWithRelations`)

**Solution**: Fetch once with relations, reuse the entity:

- Replace `findOneOrThrow()` with `findClassWithRelations()` at the start
- Use the fetched class for `centerId` validation and return value
- After updates, reload only if needed (or use the existing entity if relations haven't changed)

**Pattern**: Same as `updateGroup()` fix

---

### 2. Consolidate Path Parameter DTOs

**2.1 Create ClassIdParamDto**

**File**: Create `src/modules/classes/dto/class-id-param.dto.ts`

**Purpose**: Consolidate all `classId` path parameters into a single DTO

**Properties**:

- `classId: string` with `@IsUUID()` and `@BelongsToCenter(Class)` validation

**Replace**: All `@Param('classId', ParseUUIDPipe)` usages in:

- `ClassesController.getClass()`
- `ClassesController.updateClass()`
- `ClassesController.deleteClass()`
- `ClassesController.restoreClass()`
- `ClassStaffAccessController.getClassStaff()`

**Benefits**:

- Consistent validation
- Center ownership validated at DTO level
- Removes redundant manual validations

---

### 3. Remove Redundant Center Ownership Validations

**3.1 Remove from `getClass()`**

**File**: `src/modules/classes/services/classes.service.ts` (method: `getClass`)

**Current issue**: Manual center validation (lines 81-87) when DTO decorator can handle it

**Solution**:

- Use `ClassIdParamDto` in controller
- Remove manual `classEntity.centerId !== actor.centerId!` check
- Keep STAFF class access validation (different concern)

---

**3.2 Remove from `deleteClass()`**

**File**: `src/modules/classes/services/classes.service.ts` (method: `deleteClass`)

**Current issue**: Manual center validation (lines 232-246) when DTO decorator can handle it

**Solution**:

- Use `ClassIdParamDto` in controller
- Remove manual center validation
- Keep existence check (but use `findOneOrThrow` for consistency)

---

**3.3 Remove from `restoreClass()`**

**File**: `src/modules/classes/services/classes.service.ts` (method: `restoreClass`)

**Current issue**: Manual center validation (lines 278-284) similar to groups

**Solution**:

- Use `ClassIdParamDto` in controller (UUID validation only, center ownership validated manually for soft-deleted)
- Keep manual validation for soft-deleted classes (same pattern as `restoreGroup()`)
- Clarify comment explaining why manual validation is needed

---

**3.4 Remove from `ClassStaffService.getClassStaff()`**

**File**: `src/modules/classes/services/class-staff.service.ts` (method: `getClassStaff`)

**Current issue**: Manual center validation (lines 49-63) when DTO decorator can handle it

**Solution**:

- Use `ClassIdParamDto` in controller
- Remove manual center validation from service
- Keep existence check if needed

---

### 4. Handle Thin Wrapper Methods

**4.1 Evaluate `paginateClasses()`**

**File**: `src/modules/classes/services/classes.service.ts`

**Options**:

- Keep it as it's a core CRUD operation (similar to `paginateGroups()`)
- Document why it's kept (extracts centerId, could add authorization/transformation in future)

**Decision**: Keep it (core CRUD operation, consistent with groups pattern)

---

### 5. Service Splitting Consideration

**5.1 Payment Strategy Logic**

**Current state**: `PaymentStrategyService` already exists and is separate

**Analysis**:

- Payment strategy logic is already separated into `PaymentStrategyService`
- `ClassesService` delegates to it correctly
- No splitting needed (already follows good pattern)

**Decision**: No changes needed

---

### 6. Improve Error Semantics (Optional Enhancement)

**File**: Create `src/modules/classes/exceptions/class.exceptions.ts`

**Add domain-grouped exceptions with reason codes**:

- `ClassStaffAssignmentException` (extends `BusinessLogicException`)
  - Reason: `ALREADY_ASSIGNED` - Staff is already assigned to this class
  - Reason: `NOT_STAFF` - Profile is not of type STAFF
  - Reason: `NO_CENTER_ACCESS` - Staff doesn't have center access

**Pattern**: Same as groups module (domain-grouped, not per edge case)

**Note**: This is optional and can be done incrementally.

---

### 7. Document Bulk Operations Behavior

**Files**:

- `src/modules/classes/services/class-staff.service.ts` (methods: `bulkAssignStaffToClass`, `bulkRemoveStaffFromClass`)

**Add documentation**:

- Clarify that bulk operations are **best-effort** (partial success allowed)
- Document that individual errors are caught and aggregated
- Note that operations are not fully atomic (some may succeed, some may fail)

---

## Implementation Order

### Phase 1: Quick Wins (Low Risk)

1. Create `ClassIdParamDto` and update all controllers to use it
2. Fix `updateClass()` double fetch
3. Remove redundant center validations from `getClass()`, `deleteClass()`, `getClassStaff()`

### Phase 2: Special Cases (Low Risk)

4. Handle `restoreClass()` manual validation (keep it, document why)
5. Update `ClassStaffAccessController` to use `ClassIdParamDto`

### Phase 3: Cleanup (Low Risk)

6. Add bulk operations documentation
7. Evaluate and document `paginateClasses()` (keep it)

### Phase 4: Enhancements (Optional)

8. Improve error semantics (specific exceptions)
9. Any other improvements identified

---

## Files to Modify

### New Files

- `src/modules/classes/dto/class-id-param.dto.ts`

### Modified Files

- `src/modules/classes/services/classes.service.ts`
  - Fix `updateClass()` double fetch
  - Remove redundant validations from `getClass()`, `deleteClass()`
  - Keep manual validation in `restoreClass()` (document why)
- `src/modules/classes/services/class-staff.service.ts`
  - Remove redundant validation from `getClassStaff()`
- `src/modules/classes/controllers/classes.controller.ts`
  - Replace `ParseUUIDPipe` with `ClassIdParamDto` in all endpoints
- `src/modules/classes/controllers/class-staff-access.controller.ts`
  - Replace `ParseUUIDPipe` with `ClassIdParamDto` in `getClassStaff()`

---

## Validation Flow After Refactoring

### Before (Manual Validation)

```
Controller → Service → Manual centerId check → Repository
```

### After (DTO-Level Validation)

```
Controller (DTO decorator validates) → Service → Repository
```

**Benefits**:

- Validation happens earlier in request pipeline
- Less code duplication
- Consistent validation pattern
- Better error messages

---

## Testing Considerations

- Ensure all existing tests pass after refactoring
- Verify that DTO decorators work correctly for path parameters
- Test that soft-deleted class restoration still validates correctly
- Verify that STAFF class access validation still works
- Test that bulk operations still handle errors correctly

---

## Risk Assessment

- **Low Risk**: Creating DTO, fixing queries, removing redundant validations
- **Low Risk**: Updating controllers (straightforward replacements)
- **Low Risk**: Documentation improvements

---

## Success Criteria

- No double-fetch queries in `updateClass()`
- No redundant center ownership validations (except soft-deleted cases)
- All path parameters use DTOs with decorators
- Consistent validation pattern across classes and groups modules
- All existing functionality preserved
- Code is more maintainable and follows same patterns as groups module

---

## Comparison with Groups Module

| Aspect                        | Groups Module            | Classes Module (After)                               |
| ----------------------------- | ------------------------ | ---------------------------------------------------- |
| Path Parameter DTOs           | ✅ `GroupIdParamDto`     | ✅ `ClassIdParamDto`                                 |
| Double Fetch Fixed            | ✅ `updateGroup()`       | ✅ `updateClass()`                                   |
| Redundant Validations Removed | ✅                       | ✅                                                   |
| Service Splitting             | ✅ Split into 3 services | ✅ Already separated (PaymentStrategyService exists) |
| Bulk Operations Documented    | ✅                       | ✅                                                   |
| Validation Pattern            | ✅ DTO-level             | ✅ DTO-level                                         |

---

## Notes

- Classes module is simpler than groups (no schedule/student sub-services needed)
- Payment strategy logic already separated (good existing pattern)
- Main improvements: query efficiency, DTO consolidation, validation cleanup
- Follows same patterns as groups module for consistency
