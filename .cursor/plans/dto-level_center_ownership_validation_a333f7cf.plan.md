# DTO-Level Center Ownership Validation Plan

## Overview

Create three separate decorators for DTO-level center ownership validation, each using `AccessControlHelperService` methods instead of direct entity queries. This moves security validation earlier in the request pipeline and eliminates code duplication in service methods.

## Architecture

### Validation Flow

```
Request → ContextGuard (sets centerId in RequestContext)
       → DTO Validation (decorators use AccessControlHelperService)
       → Service Methods (business logic only, no center checks)
```

### Three Decorators

1. **@BelongsToCenter** - For entities with direct `centerId` property
   - Entities: `Level`, `Subject`, `Branch`, `Class`, `Group`
   - Validates: Entity exists AND `entity.centerId === centerId` (from RequestContext)

2. **@HasCenterAccess** - For UserProfile center access validation
   - Uses: `AccessControlHelperService.canCenterAccess()`
   - Validates: UserProfile has center access to the centerId (from RequestContext)

3. **@HasUserAccess** - For UserProfile user access validation
   - Uses: `AccessControlHelperService.canUserAccess()`
   - Validates: Actor (from RequestContext) has user access to target UserProfile

### New Helper Method

**AccessControlHelperService.canAssignProfileToClass()** - For internal assignments like `teacherUserProfileId`

- Validates profile type (e.g., must be TEACHER)
- Validates center access
- Optionally validates user access
- Returns boolean (for decorator use) or throws (for service use)

## Implementation

### Phase 1: Add New Helper Method to AccessControlHelperService

**File**: `src/modules/access-control/services/access-control-helper.service.ts`

**Add method**:

```typescript
/**
 * Validates if a profile can be assigned to a class (e.g., as teacher)
 * Checks profile type, center access, and optionally user access
 *
 * @param targetUserProfileId - The profile to validate
 * @param centerId - The center ID
 * @param requiredProfileType - Required profile type (e.g., ProfileType.TEACHER)
 * @param actorUserProfileId - Optional actor profile ID for user access check
 * @param checkUserAccess - Whether to validate user access (default: false)
 * @returns boolean - true if valid, false otherwise
 */
async canAssignProfileToClass(
  targetUserProfileId: string,
  centerId: string,
  requiredProfileType: ProfileType,
  actorUserProfileId?: string,
  checkUserAccess: boolean = false,
): Promise<boolean>
```

**Logic**:

1. Fetch UserProfile by ID
2. Check profile type matches `requiredProfileType`
3. Check center access using `canCenterAccess()`
4. If `checkUserAccess` and `actorUserProfileId` provided, check user access using `canUserAccess()`
5. Return boolean (for decorator) or throw (for service validation)

### Phase 2: Create BelongsToCenter Constraint

**File**: `src/shared/common/validators/belongs-to-center.constraint.ts`

- Inject `DataSource` (like `ExistsConstraint`)
- Access `centerId` from `RequestContext.get().centerId`
- Fetch entity by ID
- Compare `entity.centerId === centerId`
- Return boolean

**Logic**:

```typescript
async validate(value: any, args: ValidationArguments): Promise<boolean> {
  const [entityClass] = args.constraints;
  const centerId = RequestContext.get()?.centerId;

  if (!centerId) return false;

  const repo = this.dataSource.getRepository(entityClass);
  const entity = await repo.findOne({ where: { id: value } });

  if (!entity) return false;

  return entity.centerId === centerId;
}
```

### Phase 3: Create HasCenterAccess Constraint

**File**: `src/shared/common/validators/has-center-access.constraint.ts`

- Inject `AccessControlHelperService`
- Access `centerId` from `RequestContext.get().centerId`
- Use `AccessControlHelperService.canCenterAccess()` with `userProfileId: value, centerId`
- Return boolean

**Logic**:

```typescript
async validate(value: any, args: ValidationArguments): Promise<boolean> {
  const centerId = RequestContext.get()?.centerId;

  if (!centerId) return false;

  return await this.accessControlHelperService.canCenterAccess({
    userProfileId: value,
    centerId,
  });
}
```

### Phase 4: Create HasUserAccess Constraint

**File**: `src/shared/common/validators/has-user-access.constraint.ts`

- Inject `AccessControlHelperService`
- Access `centerId` and `userProfileId` from `RequestContext.get()`
- Use `AccessControlHelperService.canUserAccess()` with `granterUserProfileId: actor.userProfileId, targetUserProfileId: value, centerId`
- Return boolean

**Logic**:

```typescript
async validate(value: any, args: ValidationArguments): Promise<boolean> {
  const context = RequestContext.get();
  const centerId = context?.centerId;
  const actorUserProfileId = context?.userProfileId;

  if (!centerId || !actorUserProfileId) return false;

  return await this.accessControlHelperService.canUserAccess({
    granterUserProfileId: actorUserProfileId,
    targetUserProfileId: value,
    centerId,
  });
}
```

### Phase 5: Create Decorators

**File**: `src/shared/common/decorators/belongs-to-center.decorator.ts`

- Register `BelongsToCenterConstraint`

**File**: `src/shared/common/decorators/has-center-access.decorator.ts`

- Register `HasCenterAccessConstraint`

**File**: `src/shared/common/decorators/has-user-access.decorator.ts`

- Register `HasUserAccessConstraint`

### Phase 6: Create CanAssignProfileToClass Constraint (Optional)

**File**: `src/shared/common/validators/can-assign-profile-to-class.constraint.ts`

- Inject `AccessControlHelperService`
- Access `centerId` and `userProfileId` from `RequestContext.get()`
- Use `AccessControlHelperService.canAssignProfileToClass()` with required profile type
- Return boolean

**Note**: This can be used for `teacherUserProfileId` in `CreateClassDto` if we want DTO-level validation, or keep it in service layer.

### Phase 7: Update DTOs

#### 7.1 Class DTOs

**`src/modules/classes/dto/create-class.dto.ts`**:

- `levelId`: `@BelongsToCenter(Level)`
- `subjectId`: `@BelongsToCenter(Subject)`
- `branchId`: `@BelongsToCenter(Branch)`
- `teacherUserProfileId`: Keep service-level validation OR use `@CanAssignProfileToClass(ProfileType.TEACHER)` if decorator created

**`src/modules/classes/dto/update-class.dto.ts`**:

- Same as create if it has entity ID fields

#### 7.2 Group DTOs

**`src/modules/classes/dto/create-group.dto.ts`**:

- `classId`: `@BelongsToCenter(Class)`

**`src/modules/classes/dto/update-group.dto.ts`**:

- Check if it has entity ID fields

#### 7.3 Access DTOs

**`src/modules/classes/dto/class-staff-access.dto.ts`**:

- `userProfileId`: `@HasUserAccess` (actor has user access to target profile)
- `classId`: `@BelongsToCenter(Class)`

**`src/modules/classes/dto/group-student-access.dto.ts`**:

- `userProfileId`: `@HasCenterAccess` (student has center access)
- `groupId`: `@BelongsToCenter(Group)`

**Note**: For group student access, we use `@HasCenterAccess` because students are assigned based on center access, not user access relationships.

#### 7.4 Bulk Operation DTOs

**`src/modules/classes/dto/bulk-grant-class-staff.dto.ts`**:

- `classId`: `@BelongsToCenter(Class)`
- `userProfileIds` array: Keep service-level validation (arrays can't use decorators directly)

**`src/modules/classes/dto/bulk-revoke-class-staff.dto.ts`**:

- `classId`: `@BelongsToCenter(Class)`

**`src/modules/classes/dto/bulk-assign-students-to-group.dto.ts`**:

- `groupId`: `@BelongsToCenter(Group)`

**`src/modules/classes/dto/bulk-grant-group-student.dto.ts`**:

- `groupId`: `@BelongsToCenter(Group)`

**`src/modules/classes/dto/bulk-revoke-group-student.dto.ts`**:

- `groupId`: `@BelongsToCenter(Group)`

### Phase 8: Clean Up Service Methods

Remove redundant center ownership validations from services:

#### 8.1 ClassStaffService

**`src/modules/classes/services/class-staff.service.ts`**:

- Remove center validation from `getClassStaff` (handled by DTO)
- Remove center validation from `assignProfileToClass` (handled by DTO)
- Remove center validation from `removeUserFromClass` (handled by DTO)
- Remove center validation from `bulkAssignStaffToClass` (handled by DTO)
- Remove center validation from `bulkRemoveStaffFromClass` (handled by DTO)

#### 8.2 GroupsService

**`src/modules/classes/services/groups.service.ts`**:

- Remove center validation from `assignStudentToGroup` (handled by DTO)
- Remove center validation from `getGroupStudents` (handled by DTO)
- Remove center validation from `bulkAssignStudentsToGroup` (handled by DTO)
- Remove center validation from `removeStudentsFromGroup` (handled by DTO)
- **Add** center validation in `updateGroup` (currently missing)
- **Add** center validation in `deleteGroup` (currently missing)
- **Add** center validation in `restoreGroup` (currently missing)
- **Update** `createGroup` - ensure `validateGroup` validates class center ownership

#### 8.3 ClassesService

**`src/modules/classes/services/classes.service.ts`**:

- Remove center validation from `updateClass` (handled by DTO if update DTO has classId)
- Remove center validation from `deleteClass` (no DTO, keep service validation)
- **Add** center validation in `getClass` for non-STAFF (currently missing)
- **Add** center validation in `restoreClass` for non-STAFF (currently missing)

#### 8.4 GroupValidationService

**`src/modules/classes/services/group-validation.service.ts`**:

- **Add** center validation in `validateGroup` when fetching class (currently missing)

#### 8.5 ClassValidationService

**`src/modules/classes/services/class-validation.service.ts`**:

- **Update** `validateTeacher` to use new `canAssignProfileToClass` helper method (optional refactor)

## Files to Create

1. `src/shared/common/validators/belongs-to-center.constraint.ts`
2. `src/shared/common/validators/has-center-access.constraint.ts`
3. `src/shared/common/validators/has-user-access.constraint.ts`
4. `src/shared/common/decorators/belongs-to-center.decorator.ts`
5. `src/shared/common/decorators/has-center-access.decorator.ts`
6. `src/shared/common/decorators/has-user-access.decorator.ts`
7. `src/shared/common/validators/can-assign-profile-to-class.constraint.ts` (optional)
8. `src/shared/common/decorators/can-assign-profile-to-class.decorator.ts` (optional)

## Files to Modify

### AccessControlHelperService

1. `src/modules/access-control/services/access-control-helper.service.ts` - Add `canAssignProfileToClass` method

### DTOs (Replace @Exists with appropriate decorator)

1. `src/modules/classes/dto/create-class.dto.ts`
2. `src/modules/classes/dto/create-group.dto.ts`
3. `src/modules/classes/dto/class-staff-access.dto.ts`
4. `src/modules/classes/dto/group-student-access.dto.ts`
5. `src/modules/classes/dto/bulk-grant-class-staff.dto.ts`
6. `src/modules/classes/dto/bulk-revoke-class-staff.dto.ts`
7. `src/modules/classes/dto/bulk-assign-students-to-group.dto.ts`
8. `src/modules/classes/dto/bulk-grant-group-student.dto.ts`
9. `src/modules/classes/dto/bulk-revoke-group-student.dto.ts`

### Services (Remove redundant validations)

1. `src/modules/classes/services/class-staff.service.ts`
2. `src/modules/classes/services/groups.service.ts`
3. `src/modules/classes/services/classes.service.ts`
4. `src/modules/classes/services/group-validation.service.ts`
5. `src/modules/classes/services/class-validation.service.ts` (optional refactor)

## Testing Considerations

1. Test `BelongsToCenterConstraint` with all direct centerId entities
2. Test `HasCenterAccessConstraint` with UserProfile that has/doesn't have center access
3. Test `HasUserAccessConstraint` with valid/invalid user access relationships
4. Test validators with missing centerId/userProfileId in RequestContext
5. Test validation failure messages
6. Test that service methods no longer need center checks
7. Test `canAssignProfileToClass` with different profile types

## Benefits

1. **Early Validation**: Security checks happen at DTO validation layer
2. **Consistency**: Same pattern as `@Exists` decorator
3. **Less Code**: Eliminates duplicate center validation in services
4. **Declarative**: Ownership rules visible in DTO definitions
5. **Type Safety**: TypeScript support for decorators
6. **Maintainability**: Single source of truth using AccessControlHelperService
7. **Smart Validation**: Uses existing helper methods that handle edge cases (super admin, etc.)

## Notes

- All decorators use `AccessControlHelperService` methods, not direct entity queries
- `@HasCenterAccess` uses `canCenterAccess()` which handles super admin checks
- `@HasUserAccess` uses `canUserAccess()` which handles self-access and bypass logic
- For arrays in bulk DTOs, keep service-level validation
- For path parameters (deleteClass, restoreClass), keep service-level validation
- `teacherUserProfileId` can use service validation or optional `@CanAssignProfileToClass` decorator
