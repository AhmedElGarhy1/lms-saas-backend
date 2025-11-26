# Refactor ProfileTypePermissionService - Simplification Plan

## Current State Analysis

### Current Usage (Only 1 place - CREATE operation)

1. **`user-profile.service.ts`**: `create` operation
   ```typescript
   validateProfileTypePermission({
     actorUserProfileId: actor.userProfileId,
     profileType: dto.profileType,
     operation: 'create',
     centerId: actor.centerId,
   });
   ```

### Incorrect Usage (To be removed)

2. **`user-profile-import.service.ts`**: `grant-center-access` operation ❌
   - **Should NOT use this method**
   - Should use `validateCenterAccess()` instead
   - Only needs to check if actor has access to center

3. **`user-profile-import.service.ts`**: `import` operation ❌
   - **Should NOT use this method**
   - Should use `validateCenterAccess()` instead
   - Only needs to check if actor has access to center

### Current Problems

1. **Over-engineered for CREATE-only use case**
   - Supports `targetUserProfileId` (fetching from DB) - **NOT NEEDED** for CREATE
   - Supports `permissionPattern` (prefix/suffix) - **ALWAYS 'prefix'**
   - Complex `resolveProfileType` method - **NOT NEEDED** (profileType always provided)

2. **Unnecessary Dependencies**
   - `UserProfileService` - only used for `resolveProfileType` (not needed)
   - `PermissionService` - only used for DB fallback (can be removed, but we need DB lookup for permissions)

3. **Complex Scope Lookup**
   - Current: Tries constants first, then DB fallback
   - **IMPORTANT**: We need DB lookup because:
     - Each user can have different permissions
     - Scope-related logic needs to be checked dynamically
     - `RolesService.hasPermission()` already handles this correctly
   - We should use `RolesService.hasPermission()` directly (it handles scope from DB)

4. **Poor Developer Experience**
   - Generic method name doesn't reflect CREATE-only usage
   - Accepts `actorUserProfileId` instead of `ActorUser` (less convenient)
   - Too many optional parameters

5. **Maintenance Burden**
   - Multiple layers of abstraction
   - Unused code paths
   - Complex error handling

## Refactoring Goals

✅ **Simplify**: Remove all unused features (targetUserProfileId, permissionPattern, resolveProfileType)  
✅ **Clarify**: Rename to reflect CREATE-only usage  
✅ **Keep DB Lookup**: Use RolesService.hasPermission() for dynamic permission checking with scope  
✅ **Improve DX**: Better API, clearer errors, accept ActorUser  
✅ **Best Practices**: Single responsibility, type safety, use existing RolesService

## Proposed Solution

### New Simplified API

```typescript
// Simple, focused method for CREATE operations only
async validateCanCreateProfile(
  actor: ActorUser,
  profileType: ProfileType,
): Promise<void>
```

**Note**: Import service should use `validateCenterAccess()` instead, not this method.

### Implementation Details

1. **Remove Unused Features**
   - ❌ Remove `targetUserProfileId` support
   - ❌ Remove `permissionPattern` (always 'prefix')
   - ❌ Remove `resolveProfileType` method
   - ❌ Remove `UserProfileService` dependency
   - ❌ Remove `PermissionService` dependency (not needed, RolesService handles DB lookup)

2. **Keep DB Permission Lookup**
   - ✅ Use `RolesService.hasPermission()` which already:
     - Checks permissions from DB (via ProfileRoleRepository)
     - Handles scope logic (ADMIN, CENTER, BOTH)
     - Handles Super Admin and Center Owner bypasses
     - Returns boolean based on actual user permissions
   - ✅ Get permission action from constants (PERMISSIONS object)
   - ✅ Get scope from constants (PERMISSIONS object)
   - ✅ Pass to RolesService.hasPermission() for actual check

3. **Better API**
   - ✅ Accept `ActorUser` directly (more convenient)
   - ✅ Clear method name (`validateCanCreateProfile`)
   - ✅ Type-safe with ProfileType enum
   - ✅ Simpler error messages

4. **Code Structure**

   ```typescript
   @Injectable()
   export class ProfileTypePermissionService {
     constructor(
       private readonly rolesService: RolesService,
       private readonly i18n: I18nService<I18nTranslations>,
     ) {}

     /**
      * Validates that the actor has permission to create a profile of the given type.
      * Uses RolesService.hasPermission() which checks permissions from DB with scope logic.
      */
     async validateCanCreateProfile(
       actor: ActorUser,
       profileType: ProfileType,
     ): Promise<void> {
       // Get permission action from constants
       const permissionDef = this.getCreatePermission(profileType);

       // Use RolesService.hasPermission() which:
       // - Checks DB for user's actual permissions
       // - Handles scope logic (ADMIN, CENTER, BOTH)
       // - Handles Super Admin and Center Owner bypasses
       const hasPermission = await this.rolesService.hasPermission(
         actor.userProfileId,
         permissionDef.action,
         permissionDef.scope,
         actor.centerId,
       );

       if (!hasPermission) {
         throw new ForbiddenException(
           this.i18n.translate('t.errors.cannotCreateProfile', {
             args: { profileType },
           }),
         );
       }
     }

     /**
      * Gets the CREATE permission definition from constants.
      * Maps ProfileType to PERMISSIONS object.
      */
     private getCreatePermission(profileType: ProfileType): IPermission {
       // Map ProfileType enum to PERMISSIONS keys
       const permissionKey = this.mapProfileTypeToPermissionKey(profileType);
       const permission = PERMISSIONS[permissionKey]?.CREATE;

       if (!permission) {
         throw new Error(
           `No CREATE permission defined for profile type: ${profileType}`,
         );
       }

       return permission;
     }

     /**
      * Maps ProfileType enum to PERMISSIONS object key.
      * Example: ProfileType.STAFF -> 'STAFF', ProfileType.ADMIN -> 'ADMIN'
      */
     private mapProfileTypeToPermissionKey(
       profileType: ProfileType,
     ): keyof typeof PERMISSIONS {
       // ProfileType enum values should match PERMISSIONS keys
       return profileType.toUpperCase() as keyof typeof PERMISSIONS;
     }
   }
   ```

## Migration Steps

1. **Refactor service to simplified version**
   - Remove `validateProfileTypePermission` (old method)
   - Remove `resolveProfileType` (not needed for CREATE)
   - Remove `getScopeFromPermission` (use constants directly)
   - Remove `getScopeFromConstants` (use constants directly)
   - Add new `validateCanCreateProfile` method
   - Remove `UserProfileService` dependency
   - Remove `PermissionService` dependency

2. **Update usage in `user-profile.service.ts`**

   ```typescript
   // OLD
   await this.profileTypePermissionService.validateProfileTypePermission({
     actorUserProfileId: actor.userProfileId,
     profileType: dto.profileType,
     operation: 'create',
     centerId: actor.centerId,
   });

   // NEW
   await this.profileTypePermissionService.validateCanCreateProfile(
     actor,
     dto.profileType,
   );
   ```

3. **Fix incorrect usage in `user-profile-import.service.ts`**

   ```typescript
   // OLD (INCORRECT - should not use profile type permission)
   await this.profileTypePermissionService.validateProfileTypePermission({
     actorUserProfileId: actor.userProfileId,
     profileType: dto.profileType,
     operation: 'grant-center-access',
     centerId: resolvedCenterId,
   });

   // NEW (CORRECT - just check center access)
   if (resolvedCenterId) {
     await this.accessControlHelperService.validateCenterAccess({
       userProfileId: actor.userProfileId,
       centerId: resolvedCenterId,
     });
   }

   // For import without centerId, no permission check needed
   // (or check if actor can create profiles in general)
   ```

4. **Remove old methods and dependencies**
   - Remove `validateProfileTypePermission`
   - Remove `resolveProfileType`
   - Remove `validatePermission` (inline logic)
   - Remove `getScopeFromPermission`
   - Remove `getScopeFromConstants`
   - Remove `UserProfileService` dependency
   - Remove `PermissionService` dependency
   - Clean up unused imports

5. **Update tests** (if any)

## Benefits

✅ **60% less code** - Remove unused features (targetUserProfileId, resolveProfileType, etc.)  
✅ **Correct permission checking** - Uses RolesService.hasPermission() which checks DB with scope logic  
✅ **Clearer intent** - Method name reflects CREATE-only usage  
✅ **Better DX** - Simpler API, accept ActorUser directly  
✅ **Easier maintenance** - Less code, single responsibility  
✅ **Type safety** - ProfileType enum, no string operations  
✅ **Proper separation** - Import service uses center access check, not profile permission check

## Files to Modify

1. `src/modules/access-control/services/profile-type-permission.service.ts` - Complete refactor
2. `src/modules/user-profile/services/user-profile.service.ts` - Update usage (CREATE only)
3. `src/modules/user-profile/services/user-profile-import.service.ts` - Fix incorrect usage (use validateCenterAccess)
4. `src/modules/access-control/access-control.module.ts` - Remove unused dependencies

## Estimated Impact

- **Lines of code**: ~245 → ~60 (75% reduction)
- **Dependencies**: 4 → 2 (50% reduction - remove UserProfileService, PermissionService)
- **Method complexity**: High → Low
- **Developer experience**: Good → Excellent
- **Correctness**: Fixes incorrect usage in import service

## Key Changes Summary

1. **Simplified to CREATE-only**: Remove all unused features
2. **Keep DB lookup**: Use RolesService.hasPermission() for dynamic permission checking
3. **Fix import service**: Use validateCenterAccess() instead of profile permission check
4. **Better API**: Accept ActorUser, clear method name, type-safe
