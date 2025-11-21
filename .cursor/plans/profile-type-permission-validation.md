# Generic Profile Type Permission Validation Service

## Core Requirements

1. **Extract profileType from target userProfileId OR use provided profileType** - Flexible input handling
2. **Build permission dynamically** - Construct permission string using profileType + operation (flexible pattern)
3. **Check actor's permission** - Validate if the actor user has the required permission
4. **Generic and reusable** - Work with any profile type, any operation, any permission pattern

## Design Principles

- **Single Responsibility:** Service only validates profile type permissions
- **Flexibility:** Support different permission naming patterns (prefix/suffix)
- **Reusability:** Work for create/update/delete/read and any future operations
- **Unified API:** One method handles both create (profileType from DTO) and update/delete (profileType from DB)
- **Type Safety:** Use enums and TypeScript types
- **Clear API:** Simple, intuitive method signature

## Implementation Plan

### Phase 1: Create Permission Builder Utility

**File:** `src/modules/access-control/utils/profile-type-permission.util.ts`

**Purpose:** Generic utility to build permission strings from profile type and operation

```typescript
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

/**
 * Maps ProfileType enum values to permission prefixes
 * Example: ProfileType.STAFF → "staff", ProfileType.ADMIN → "admin"
 */
export const PROFILE_TYPE_TO_PERMISSION_PREFIX: Record<ProfileType, string> = {
  [ProfileType.STAFF]: 'staff',
  [ProfileType.ADMIN]: 'admin',
  [ProfileType.TEACHER]: 'teacher',
  [ProfileType.STUDENT]: 'student',
  [ProfileType.PARENT]: 'parent',
};

/**
 * Builds a permission string from profile type and operation
 * 
 * @param profileType - The profile type (e.g., ProfileType.STAFF)
 * @param operation - The operation (e.g., 'create', 'update', 'delete', 'read')
 * @param pattern - Permission pattern: 'prefix' (staff:create) or 'suffix' (create:staff)
 * @returns Permission string (e.g., 'staff:create' or 'create:staff')
 */
export function buildPermissionFromProfileType(
  profileType: ProfileType,
  operation: string,
  pattern: 'prefix' | 'suffix' = 'prefix',
): string {
  const prefix = PROFILE_TYPE_TO_PERMISSION_PREFIX[profileType];
  
  if (!prefix) {
    throw new Error(`Unknown profile type: ${profileType}`);
  }
  
  return pattern === 'prefix' 
    ? `${prefix}:${operation}`
    : `${operation}:${prefix}`;
}
```

### Phase 2: Create ProfileTypePermissionService

**File:** `src/modules/access-control/services/profile-type-permission.service.ts`

**Key Design:** Single unified method that accepts either `targetUserProfileId` OR `profileType`

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { RolesService } from './roles.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { PermissionScope } from '../constants/permissions';
import {
  buildPermissionFromProfileType,
} from '../utils/profile-type-permission.util';
import { ResourceNotFoundException, ValidationFailedException } from '@/shared/common/exceptions/custom.exceptions';

export interface ValidateProfileTypePermissionOptions {
  /**
   * The user profile ID of the actor (person performing the action)
   */
  actorUserProfileId: string;
  
  /**
   * The user profile ID of the target (profile being operated on)
   * Used to fetch the profileType from database
   * Either targetUserProfileId OR profileType must be provided
   */
  targetUserProfileId?: string;
  
  /**
   * The profile type being operated on
   * Use this for create operations where profileType is in DTO
   * Either targetUserProfileId OR profileType must be provided
   */
  profileType?: ProfileType;
  
  /**
   * The operation being performed (create/update/delete/read)
   */
  operation: 'create' | 'update' | 'delete' | 'read';
  
  /**
   * Optional center ID for scope validation
   */
  centerId?: string;
  
  /**
   * Permission naming pattern: 'prefix' (staff:create) or 'suffix' (create:staff)
   * Default: 'prefix'
   */
  permissionPattern?: 'prefix' | 'suffix';
}

@Injectable()
export class ProfileTypePermissionService {
  constructor(
    private readonly rolesService: RolesService,
    private readonly userProfileService: UserProfileService,
  ) {}

  /**
   * Validates that the actor has permission to perform the operation on the target profile type
   * 
   * Flow:
   * 1. Get profileType (from options.profileType OR fetch from targetUserProfileId)
   * 2. Build permission string (profileType + operation)
   * 3. Check if actor has that permission
   * 4. Throw ForbiddenException if not
   * 
   * @param options - Validation options (must provide either targetUserProfileId OR profileType)
   * @throws ForbiddenException if actor doesn't have required permission
   * @throws ResourceNotFoundException if target profile not found (when using targetUserProfileId)
   * @throws ValidationFailedException if neither targetUserProfileId nor profileType provided
   * 
   * @example
   * // Create operation - profileType from DTO
   * await service.validateProfileTypePermission({
   *   actorUserProfileId: 'actor-profile-id',
   *   profileType: ProfileType.STAFF, // From DTO
   *   operation: 'create',
   * });
   * 
   * // Update operation - profileType from target profile
   * await service.validateProfileTypePermission({
   *   actorUserProfileId: 'actor-profile-id',
   *   targetUserProfileId: 'target-profile-id', // Fetches profileType from DB
   *   operation: 'update',
   * });
   */
  async validateProfileTypePermission(
    options: ValidateProfileTypePermissionOptions,
  ): Promise<void> {
    // Step 1: Get profileType (from options OR fetch from targetUserProfileId)
    let profileType: ProfileType;

    if (options.profileType) {
      // Use profileType directly (create operations)
      profileType = options.profileType;
    } else if (options.targetUserProfileId) {
      // Fetch profileType from target profile (update/delete operations)
      const targetProfile = await this.userProfileService.findOne(
        options.targetUserProfileId,
      );

      if (!targetProfile) {
        throw new ResourceNotFoundException('User profile not found');
      }

      profileType = targetProfile.profileType;
    } else {
      throw new ValidationFailedException(
        'Either targetUserProfileId or profileType must be provided',
      );
    }

    // Step 2: Build permission string dynamically
    const requiredPermission = buildPermissionFromProfileType(
      profileType,
      options.operation,
      options.permissionPattern || 'prefix',
    );

    // Step 3: Determine scope based on profile type
    const scope = this.getScopeForProfileType(profileType);

    // Step 4: Check if actor has the permission
    const hasPermission = await this.rolesService.hasPermission(
      options.actorUserProfileId,
      requiredPermission,
      scope,
      options.centerId,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to ${options.operation} ${profileType} profiles. ` +
        `Required permission: ${requiredPermission}`,
      );
    }
  }

  /**
   * Determines the permission scope based on profile type
   * Admin operations require ADMIN scope, others require CENTER scope
   */
  private getScopeForProfileType(profileType: ProfileType): PermissionScope {
    return profileType === ProfileType.ADMIN
      ? PermissionScope.ADMIN
      : PermissionScope.CENTER;
  }
}
```

### Phase 3: Update UserProfileService Methods

**File:** `src/modules/user-profile/services/user-profile.service.ts`

**Update methods to call the validation service:**

```typescript
// In createProfile() - use profileType from DTO
await this.profileTypePermissionService.validateProfileTypePermission({
  actorUserProfileId: actor.userProfileId,
  profileType: dto.profileType, // From DTO
  operation: 'create',
  centerId: actor.centerId,
});

// In updateProfile() - fetch profileType from target profile
await this.profileTypePermissionService.validateProfileTypePermission({
  actorUserProfileId: actor.userProfileId,
  targetUserProfileId: userProfileId, // Fetches profileType from DB
  operation: 'update',
  centerId: actor.centerId,
});

// In deleteUserProfile() - fetch profileType from target profile
await this.profileTypePermissionService.validateProfileTypePermission({
  actorUserProfileId: actor.userProfileId,
  targetUserProfileId: userProfileId, // Fetches profileType from DB
  operation: 'delete',
  centerId: actor.centerId,
});

// In activateProfileUser() - fetch profileType from target profile
await this.profileTypePermissionService.validateProfileTypePermission({
  actorUserProfileId: actor.userProfileId,
  targetUserProfileId: userProfileId, // Fetches profileType from DB
  operation: 'update', // Status change is an update operation
  centerId: actor.centerId,
});
```

### Phase 4: Register Service in Module

**File:** `src/modules/access-control/access-control.module.ts`

Add `ProfileTypePermissionService` to providers.

## Usage Examples

### Example 1: Create Operation (profileType from DTO)

```typescript
// UserProfileService.createProfile()
await this.profileTypePermissionService.validateProfileTypePermission({
  actorUserProfileId: actor.userProfileId,
  profileType: dto.profileType, // "Admin" or "Staff"
  operation: 'create',
  centerId: actor.centerId,
});
// If dto.profileType is "Admin", checks "admin:create" permission
// If dto.profileType is "Staff", checks "staff:create" permission
```

### Example 2: Update Operation (fetch profileType from ID)

```typescript
// UserProfileService.updateProfile()
await this.profileTypePermissionService.validateProfileTypePermission({
  actorUserProfileId: actor.userProfileId,
  targetUserProfileId: userProfileId, // Service fetches profileType from DB
  operation: 'update',
  centerId: actor.centerId,
});
// Service: 1) Fetches profile, 2) Gets profileType="Admin", 3) Builds "admin:update", 4) Checks permission
```

### Example 3: User Has All Permissions

```typescript
// User has: staff:create, admin:create, staff:update, admin:update, etc.
// Creating Staff profile:
await service.validateProfileTypePermission({
  actorUserProfileId: 'actor-id',
  profileType: ProfileType.STAFF,
  operation: 'create',
});
// Builds "staff:create" → User has it → ✅ Passes

// Creating Admin profile:
await service.validateProfileTypePermission({
  actorUserProfileId: 'actor-id',
  profileType: ProfileType.ADMIN,
  operation: 'create',
});
// Builds "admin:create" → User has it → ✅ Passes
```

## Benefits

✅ **Generic:** Works with any profile type, any operation  
✅ **Flexible:** Supports prefix/suffix permission patterns  
✅ **Reusable:** Same service for all operations  
✅ **Unified API:** One method handles both create and update/delete scenarios  
✅ **Type-safe:** Uses enums and TypeScript  
✅ **Works with multiple permissions:** If user has all permissions, works for all types  
✅ **Single source of truth:** ProfileType fetched from target profile when needed  

## Testing Strategy

### Unit Tests

1. **ProfileTypePermissionService:**
   - Test validation with matching permission
   - Test validation with mismatched permission
   - Test with profileType from options (create)
   - Test with profileType from targetUserProfileId (update/delete)
   - Test with user having multiple permissions
   - Test with user having all permissions
   - Test permission pattern (prefix vs suffix)
   - Test error when neither profileType nor targetUserProfileId provided

2. **Utility Functions:**
   - Test permission string building (prefix)
   - Test permission string building (suffix)
   - Test profile type extraction from permission

### Integration Tests

1. **Service Integration:**
   - Test create with matching permission
   - Test create with mismatched permission
   - Test update with matching permission
   - Test update with mismatched permission
   - Test delete with matching permission
   - Test delete with mismatched permission

