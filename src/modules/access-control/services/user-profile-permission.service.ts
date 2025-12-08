import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import {
  InsufficientPermissionsException,
  ResourceNotFoundException,
} from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { RolesService } from './roles.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { PERMISSIONS } from '../constants/permissions';
import { isUUID } from 'class-validator';

@Injectable()
export class UserProfilePermissionService extends BaseService {
  private readonly logger: Logger = new Logger(
    UserProfilePermissionService.name,
  );

  constructor(
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => UserProfileService))
    private readonly userProfileService: UserProfileService,
  ) {
    super();
  }

  /**
   * Checks if a string is a valid ProfileType enum value
   * @private
   */
  private isProfileType(str: string): str is ProfileType {
    return Object.values(ProfileType).includes(str as ProfileType);
  }

  /**
   * Resolves profileType from either direct value or by fetching from userProfileId
   * @private
   */
  private async resolveProfileType(
    profileType?: ProfileType,
    userProfileId?: string,
  ): Promise<ProfileType> {
    if (profileType) {
      return profileType;
    }

    if (userProfileId) {
      // Validate that userProfileId is actually a UUID before querying
      if (!isUUID(userProfileId)) {
        throw new ResourceNotFoundException('t.messages.fieldInvalidFormat', {
          field: 't.resources.profile',
        });
      }

      const profile = await this.userProfileService.findOne(userProfileId);
      if (!profile) {
        throw new ResourceNotFoundException('t.messages.withIdNotFound', {
          resource: 't.resources.profile',
          identifier: 't.resources.identifier',
          value: userProfileId,
        });
      }
      return profile.profileType;
    }

    throw new ResourceNotFoundException('t.messages.requiredOneOf', {
      field1: 't.resources.profileType',
      field2: 't.resources.profile',
    });
  }

  /**
   * Checks permission for a given action on a profile type
   * @private
   */
  private async checkPermission(
    actor: ActorUser,
    profileType: ProfileType,
    permissionKey:
      | 'CREATE'
      | 'UPDATE'
      | 'DELETE'
      | 'RESTORE'
      | 'ACTIVATE'
      | 'IMPORT_PROFILE'
      | 'GRANT_USER_ACCESS'
      | 'GRANT_CENTER_ACCESS',
    centerId?: string,
  ): Promise<void> {
    // Determine which permission to check based on profile type
    let requiredPermission;
    if (profileType === ProfileType.STAFF) {
      requiredPermission = PERMISSIONS.STAFF[permissionKey];
    } else if (profileType === ProfileType.ADMIN) {
      requiredPermission = PERMISSIONS.ADMIN[permissionKey];
    } else if (profileType === ProfileType.STUDENT) {
      if (permissionKey === 'GRANT_USER_ACCESS') {
        throw new InsufficientPermissionsException(
          't.messages.actionNotAllowed',
          {
            action: 't.buttons.grantResourceAccess',
            resource: 't.resources.student',
            reason: 't.messages.cannotGrantAccess',
          },
        );
      }
      requiredPermission = PERMISSIONS.STUDENT[permissionKey];
    } else if (profileType === ProfileType.TEACHER) {
      if (permissionKey === 'GRANT_USER_ACCESS') {
        throw new InsufficientPermissionsException(
          't.messages.actionNotAllowed',
          {
            action: 't.buttons.grantResourceAccess',
            resource: 't.resources.teacher',
            reason: 't.messages.cannotGrantAccess',
          },
        );
      }
      requiredPermission = PERMISSIONS.TEACHER[permissionKey];
    } else {
      throw new ResourceNotFoundException('t.messages.fieldInvalid', {
        field: 't.resources.profileType',
      });
    }

    // Check if actor has the required permission
    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      requiredPermission.action,
      requiredPermission.scope,
      centerId ?? actor.centerId,
    );

    if (!hasPermission) {
      throw new InsufficientPermissionsException(
        't.messages.insufficientPermissions',
      );
    }
  }

  /**
   * Helper method to resolve profile type and check permission
   * Safely distinguishes between ProfileType enum values and UUID strings
   * @private
   */
  private async resolveAndCheckPermission(
    actor: ActorUser,
    profileTypeOrId: ProfileType | string,
    permissionKey:
      | 'CREATE'
      | 'UPDATE'
      | 'DELETE'
      | 'RESTORE'
      | 'ACTIVATE'
      | 'IMPORT_PROFILE'
      | 'GRANT_USER_ACCESS'
      | 'GRANT_CENTER_ACCESS',
    centerId?: string,
  ): Promise<void> {
    // If it's a string, check if it's a UUID or a ProfileType enum value
    let profileType: ProfileType | undefined;
    let userProfileId: string | undefined;

    if (typeof profileTypeOrId === 'string') {
      if (isUUID(profileTypeOrId)) {
        // It's a valid UUID, treat as userProfileId
        userProfileId = profileTypeOrId;
      } else if (this.isProfileType(profileTypeOrId)) {
        // It's a ProfileType enum value (e.g., "Staff", "Admin")
        profileType = profileTypeOrId;
      } else {
        // Invalid string - neither UUID nor ProfileType
        throw new ResourceNotFoundException('t.messages.fieldInvalid', {
          field: 't.resources.profileType',
        });
      }
    } else {
      // It's already a ProfileType enum
      profileType = profileTypeOrId;
    }

    const resolvedProfileType = await this.resolveProfileType(
      profileType,
      userProfileId,
    );
    await this.checkPermission(
      actor,
      resolvedProfileType,
      permissionKey,
      centerId,
    );
  }

  /**
   * Checks if actor can create a profile of the specified type
   * @param actor The user performing the action
   * @param profileTypeOrId Either ProfileType or userProfileId to fetch profileType from
   * @param centerId Optional center ID for permission scope
   */
  async canCreate(
    actor: ActorUser,
    profileTypeOrId: ProfileType | string,
    centerId?: string,
  ): Promise<void> {
    await this.resolveAndCheckPermission(
      actor,
      profileTypeOrId,
      'CREATE',
      centerId,
    );
  }

  /**
   * Checks if actor can update a profile of the specified type
   * @param actor The user performing the action
   * @param profileTypeOrId Either ProfileType or userProfileId to fetch profileType from
   * @param centerId Optional center ID for permission scope
   */
  async canUpdate(
    actor: ActorUser,
    profileTypeOrId: ProfileType | string,
    centerId?: string,
  ): Promise<void> {
    await this.resolveAndCheckPermission(
      actor,
      profileTypeOrId,
      'UPDATE',
      centerId,
    );
  }

  /**
   * Checks if actor can delete a profile of the specified type
   * @param actor The user performing the action
   * @param profileTypeOrId Either ProfileType or userProfileId to fetch profileType from
   * @param centerId Optional center ID for permission scope
   */
  async canDelete(
    actor: ActorUser,
    profileTypeOrId: ProfileType | string,
    centerId?: string,
  ): Promise<void> {
    await this.resolveAndCheckPermission(
      actor,
      profileTypeOrId,
      'DELETE',
      centerId,
    );
  }

  /**
   * Checks if actor can restore a profile of the specified type
   * @param actor The user performing the action
   * @param profileTypeOrId Either ProfileType or userProfileId to fetch profileType from
   * @param centerId Optional center ID for permission scope
   */
  async canRestore(
    actor: ActorUser,
    profileTypeOrId: ProfileType | string,
    centerId?: string,
  ): Promise<void> {
    await this.resolveAndCheckPermission(
      actor,
      profileTypeOrId,
      'RESTORE',
      centerId,
    );
  }

  /**
   * Checks if actor can activate/deactivate a profile of the specified type
   * @param actor The user performing the action
   * @param profileTypeOrId Either ProfileType or userProfileId to fetch profileType from
   * @param centerId Optional center ID for permission scope
   */
  async canActivate(
    actor: ActorUser,
    profileTypeOrId: ProfileType | string,
    centerId?: string,
  ): Promise<void> {
    await this.resolveAndCheckPermission(
      actor,
      profileTypeOrId,
      'ACTIVATE',
      centerId,
    );
  }

  /**
   * Checks if actor can import a profile of the specified type
   * @param actor The user performing the action
   * @param profileTypeOrId Either ProfileType or userProfileId to fetch profileType from
   * @param centerId Optional center ID for permission scope
   */
  async canImportProfile(
    actor: ActorUser,
    profileTypeOrId: ProfileType | string,
    centerId?: string,
  ): Promise<void> {
    await this.resolveAndCheckPermission(
      actor,
      profileTypeOrId,
      'IMPORT_PROFILE',
      centerId,
    );
  }

  /**
   * Checks if actor can grant user access for a profile of the specified type
   * @param actor The user performing the action
   * @param profileTypeOrId Either ProfileType or userProfileId to fetch profileType from
   * @param centerId Optional center ID for permission scope
   */
  async canGrantUserAccess(
    actor: ActorUser,
    profileTypeOrId: ProfileType | string,
    centerId?: string,
  ): Promise<void> {
    await this.resolveAndCheckPermission(
      actor,
      profileTypeOrId,
      'GRANT_USER_ACCESS',
      centerId,
    );
  }

  /**
   * Checks if actor can grant center access for a profile of the specified type
   * @param actor The user performing the action
   * @param profileTypeOrId Either ProfileType or userProfileId to fetch profileType from
   * @param centerId Optional center ID for permission scope
   */
  async canGrantCenterAccess(
    actor: ActorUser,
    profileTypeOrId: ProfileType | string,
    centerId?: string,
  ): Promise<void> {
    await this.resolveAndCheckPermission(
      actor,
      profileTypeOrId,
      'GRANT_CENTER_ACCESS',
      centerId,
    );
  }
}
