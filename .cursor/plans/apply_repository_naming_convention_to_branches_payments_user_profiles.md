# Apply Repository Naming Convention to Branches, Payments, and User Profiles Modules

## Analysis

After reviewing the three modules:

### Branches Module
- **Current State**: `findBranchWithRelations` only loads `center.id` and `center.name`
- **Usage**: Used by `getBranch()` which is called by controller (API response)
- **Status**: No bug - service doesn't access `center.isActive` from loaded relation (makes separate service call). Should apply naming convention for consistency.

### Payments Module
- **Current State**: `findPaymentWithRelations` loads selective fields from multiple relations (sender/receiver names, teacher/student profiles, classes, etc.)
- **Usage**: Used by `getPaymentWithRelations()` which is called by controller (API response)
- **Status**: No bug - optimized for API responses. Should apply naming convention for consistency.

### User Profiles Module
- **Current State**: `findUserProfileWithRelations` loads full user entity with `leftJoinAndSelect` (which is correct for profile view)
- **Usage**: Used by `findOne()` which is called by controller (API response)
- **Status**: No bug - user relation is fully loaded which is needed. Should apply naming convention for consistency, but note that user relation should remain fully loaded even in "ForResponse" method since it's essential for profile display.

## Implementation Plan

### Phase 1: Branches Module

**File**: `src/modules/centers/repositories/branches.repository.ts`

1. **Rename existing methods:**
   - `findBranchWithRelations()` → `findBranchForResponse()`
   - `findBranchWithRelationsOrThrow()` → `findBranchForResponseOrThrow()`
   - Add JSDoc: "Optimized for API responses - selects only necessary fields"

2. **Create new methods for internal use (if needed in future):**
   - `findBranchWithFullRelations()` - Loads full center entity
   - `findBranchWithFullRelationsOrThrow()` - Throwing variant
   - Add JSDoc: "For internal use - loads complete entities with all properties"

3. **Update service layer** (`src/modules/centers/services/branches.service.ts`):
   - Update `getBranch()` to use `findBranchForResponseOrThrow()`

### Phase 2: Payments Module

**File**: `src/modules/finance/repositories/payment.repository.ts`

1. **Rename existing methods:**
   - `findPaymentWithRelations()` → `findPaymentForResponse()`
   - `findPaymentWithRelationsOrThrow()` → `findPaymentForResponseOrThrow()`
   - Add JSDoc: "Optimized for API responses - selects only necessary fields"

2. **Create new methods for internal use (if needed in future):**
   - `findPaymentWithFullRelations()` - Loads full entities for all relations (sender/receiver profiles, branches, centers, teacher/student profiles, classes, etc.)
   - `findPaymentWithFullRelationsOrThrow()` - Throwing variant
   - Add JSDoc: "For internal use - loads complete entities with all properties"

3. **Update service layer** (`src/modules/finance/services/payment.service.ts`):
   - Update `getPaymentWithRelations()` to use `findPaymentForResponseOrThrow()`

### Phase 3: User Profiles Module

**File**: `src/modules/user-profile/repositories/user-profile.repository.ts`

1. **Rename existing methods:**
   - `findUserProfileWithRelations()` → `findUserProfileForResponse()`
   - `findUserProfileWithRelationsOrThrow()` → `findUserProfileForResponseOrThrow()`
   - Add JSDoc: "Optimized for API responses - loads user relation fully (needed for profile display) and selective audit fields"

2. **Create new methods for internal use (if needed in future):**
   - `findUserProfileWithFullRelations()` - Loads full entities for all relations including full audit entities
   - `findUserProfileWithFullRelationsOrThrow()` - Throwing variant
   - Add JSDoc: "For internal use - loads complete entities with all properties"

3. **Update service layer** (`src/modules/user-profile/services/user-profile.service.ts`):
   - Update `findOne()` to use `findUserProfileForResponseOrThrow()`

## Files to Modify

1. `src/modules/centers/repositories/branches.repository.ts`
   - Rename methods
   - Add new full relations methods
   - Add JSDoc comments

2. `src/modules/centers/services/branches.service.ts`
   - Update `getBranch()` method

3. `src/modules/finance/repositories/payment.repository.ts`
   - Rename methods
   - Add new full relations methods
   - Add JSDoc comments

4. `src/modules/finance/services/payment.service.ts`
   - Update `getPaymentWithRelations()` method

5. `src/modules/user-profile/repositories/user-profile.repository.ts`
   - Rename methods
   - Add new full relations methods
   - Add JSDoc comments

6. `src/modules/user-profile/services/user-profile.service.ts`
   - Update `findOne()` method

## Benefits

1. **Consistency**: All modules follow the same naming convention
2. **Clarity**: Method names clearly indicate their purpose
3. **Future-proofing**: Full relations methods available if needed later
4. **Documentation**: Clear JSDoc comments explain when to use each method
5. **Prevention**: Prevents the same bug from occurring in these modules

## Notes

- Branches module: Simple case (only center relation), no immediate bug
- Payments module: Complex case with multiple relations, but optimized correctly for responses
- User Profiles module: User relation is fully loaded (correct for profile display), but should still follow naming convention
- All changes are backward-compatible in terms of functionality - only method names change
