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
import { I18nPath } from '@/generated/i18n.generated';

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
      const profile = await this.userProfileService.findOne(userProfileId);
      if (!profile) {
        throw new ResourceNotFoundException('t.errors.userProfileNotFound');
      }
      return profile.profileType;
    }

    throw new ResourceNotFoundException(
      't.errors.profileTypeOrIdRequired' as I18nPath,
    );
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
    } else {
      throw new ResourceNotFoundException(
        't.errors.invalidProfileType' as I18nPath,
      );
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
        't.errors.insufficientPermissions' as I18nPath,
        {
          action: requiredPermission.action,
          profileType,
        },
      );
    }
  }

  /**
   * Helper method to resolve profile type and check permission
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
    const profileType = await this.resolveProfileType(
      typeof profileTypeOrId === 'string' ? undefined : profileTypeOrId,
      typeof profileTypeOrId === 'string' ? profileTypeOrId : undefined,
    );
    await this.checkPermission(actor, profileType, permissionKey, centerId);
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
