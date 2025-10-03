import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { AccessControlHelperService } from './access-control-helper.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { UserOnCenterRepository } from '../repositories/user-on-center.repository';

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  constructor(
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly permissionService: PermissionService,
    private readonly userAccessRepository: UserAccessRepository,
    private readonly userOnCenterRepository: UserOnCenterRepository,
  ) {}

  async grantUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    await this.userAccessRepository.grantUserAccess(body);
  }

  async revokeUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    await this.userAccessRepository.revokeUserAccess(body);
  }

  async grantUserAccessValidate(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    // Check user already have access
    const IHaveAccessToGranterUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: body.userId,
        targetUserId: body.granterUserId,
        centerId: body.centerId,
      });

    if (!IHaveAccessToGranterUser) {
      throw new ForbiddenException('You do not have access to granter user');
    }

    const IHaveAccessToTargetUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: body.userId,
        targetUserId: body.targetUserId,
        centerId: body.centerId,
      });

    if (!IHaveAccessToTargetUser) {
      throw new ForbiddenException('You do not have access to target user');
    }

    // check if target user have height role
    const granterUserHighestRole =
      await this.accessControlHelperService.getUserRole(
        body.granterUserId,
        body.centerId,
      );
    const granterUserRoleType = granterUserHighestRole?.role?.type;
    if (granterUserRoleType === RoleType.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Granter user is a super admin and can access any user',
      );
    }

    if (body.centerId) {
      await this.accessControlHelperService.validateCenterAccess({
        userId: body.userId,
        centerId: body.centerId,
      });
    }

    // Check if access already exists
    const canAccess = await this.accessControlHelperService.canUserAccess({
      granterUserId: body.granterUserId,
      targetUserId: body.targetUserId,
      centerId: body.centerId,
    });

    if (canAccess) {
      throw new ForbiddenException('User already has access');
    }

    await this.grantUserAccess(body);
  }

  async revokeUserAccessValidate(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    // Check user already have access
    const IHaveAccessToGranterUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: body.userId,
        targetUserId: body.granterUserId,
        centerId: body.centerId,
      });

    if (!IHaveAccessToGranterUser) {
      throw new ForbiddenException('You do not have access to granter user');
    }

    const IHaveAccessToTargetUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: body.userId,
        targetUserId: body.targetUserId,
        centerId: body.centerId,
      });

    if (!IHaveAccessToTargetUser) {
      throw new ForbiddenException('You do not have access to target user');
    }

    if (body.centerId) {
      const IHaveAccessToCenter =
        await this.accessControlHelperService.canCenterAccess({
          userId: body.userId,
          centerId: body.centerId,
        });

      if (!IHaveAccessToCenter) {
        throw new ForbiddenException('You do not have access to center');
      }
    }

    // Check if access exists
    const canAccess = await this.accessControlHelperService.canUserAccess({
      granterUserId: body.granterUserId,
      targetUserId: body.targetUserId,
      centerId: body.centerId,
    });

    if (!canAccess) {
      throw new ForbiddenException('User does not have access');
    }

    await this.revokeUserAccess(body);
  }

  async grantCenterAccess(
    userId: string,
    centerId: string,
    grantedBy: string,
  ): Promise<void> {
    const userHighestRole = await this.accessControlHelperService.getUserRole(
      userId,
      centerId,
    );
    const userRoleType = userHighestRole?.role?.type;
    if (userRoleType === RoleType.SUPER_ADMIN) {
      return;
    }

    await this.userOnCenterRepository.grantCenterAccess({
      userId,
      centerId,
      grantedBy,
    });
  }

  async grantCenterAccessValidate(
    userId: string,
    centerId: string,
    grantedBy: string,
  ): Promise<void> {
    const IHaveAccessToCenter =
      await this.accessControlHelperService.canCenterAccess({
        centerId,
        userId: grantedBy,
      });

    if (!IHaveAccessToCenter) {
      throw new ForbiddenException('You do not have access to center');
    }

    const IHaveAccessToUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: grantedBy,
        targetUserId: userId,
        centerId,
      });

    if (!IHaveAccessToUser) {
      throw new ForbiddenException('You do not have access to user');
    }

    const userHasAccessToCenter =
      await this.accessControlHelperService.canCenterAccess({
        userId,
        centerId,
      });
    if (userHasAccessToCenter) {
      throw new ForbiddenException('User already has access to center');
    }

    await this.grantCenterAccess(userId, centerId, grantedBy);
  }

  async revokeCenterAccess(userId: string, centerId: string): Promise<void> {
    await this.userOnCenterRepository.revokeCenterAccess({
      userId,
      centerId,
    });
  }

  async revokeCenterAccessValidate(
    currentUserId: string,
    userId: string,
    centerId: string,
  ): Promise<void> {
    const IHaveAccessToCenter =
      await this.accessControlHelperService.canCenterAccess({
        userId,
        centerId,
      });
    if (!IHaveAccessToCenter) {
      throw new ForbiddenException('You do not have access to center');
    }

    const IHaveAccessToUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: currentUserId,
        targetUserId: userId,
        centerId,
      });
    if (!IHaveAccessToUser) {
      throw new ForbiddenException('You do not have access to user');
    }

    const userHasAccessToCenter =
      await this.accessControlHelperService.canCenterAccess({
        userId,
        centerId,
      });
    if (!userHasAccessToCenter) {
      throw new ForbiddenException('User does not have access to center');
    }

    await this.revokeCenterAccess(userId, centerId);
  }

  // Additional methods needed by other services

  async getAccessibleUserIds(userId: string): Promise<string[]> {
    const userAccesses =
      await this.userAccessRepository.listUserAccesses(userId);
    return userAccesses.map((access: UserAccess) => access.targetUserId);
  }
}
