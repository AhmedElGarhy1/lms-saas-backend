import { Injectable, ForbiddenException } from '@nestjs/common';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { RolesService } from './roles.service';
import { PERMISSIONS } from '../constants/permissions';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class ProfileTypePermissionService {
  constructor(private readonly rolesService: RolesService) {}

  async validateCanCreateProfile(
    actor: ActorUser,
    profileType: ProfileType,
  ): Promise<void> {
    const permission =
      profileType === ProfileType.STAFF
        ? PERMISSIONS.STAFF.CREATE
        : profileType === ProfileType.ADMIN
          ? PERMISSIONS.ADMIN.CREATE
          : null;

    if (!permission) {
      throw new Error(
        `No CREATE permission defined for profile type: ${profileType}`,
      );
    }

    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      permission.action,
      permission.scope,
      actor.centerId,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to create ${profileType} profiles. Required permission: ${permission.action}`,
      );
    }
  }
}
