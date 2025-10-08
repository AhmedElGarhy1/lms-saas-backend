import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { AccessControlHelperService } from './access-control-helper.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { GlobalAccessRepository } from '../repositories/global-access.repository';
import { GrantGlobalAccessDto } from '../dto/grant-global-access.dto';
import { RevokeGlobalAccessDto } from '../dto/revoke-global-access.dto';

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  constructor(
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly permissionService: PermissionService,
    private readonly userAccessRepository: UserAccessRepository,
    private readonly globalAccessRepository: GlobalAccessRepository,
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
    if (granterUserRoleType === RoleType.SYSTEM) {
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

  // Global Access Management Methods

  async grantGlobalAccess(dto: GrantGlobalAccessDto, actorId: string) {
    // Validate that the granter has permission to grant access
    await this.accessControlHelperService.validateUserAccess({
      granterUserId: actorId,
      targetUserId: dto.userId,
      centerId: dto.centerId,
    });

    // Check if user has admin role
    const hasAdminRole = await this.accessControlHelperService.hasAdminRole(
      dto.userId,
    );
    if (!hasAdminRole) {
      throw new ForbiddenException(
        'Only users with admin roles can be granted global access',
      );
    }

    return this.globalAccessRepository.grantGlobalAccess(
      dto.userId,
      dto.centerId,
    );
  }

  async revokeGlobalAccess(dto: RevokeGlobalAccessDto, granterUserId: string) {
    this.logger.log(
      `Revoking global access: User ${dto.userId} from Center ${dto.centerId} by ${granterUserId}`,
    );

    // Validate that the granter has permission to revoke access
    await this.accessControlHelperService.validateUserAccess({
      granterUserId,
      targetUserId: dto.userId,
      centerId: dto.centerId,
    });

    return this.globalAccessRepository.revokeGlobalAccess(
      dto.userId,
      dto.centerId,
    );
  }

  // Additional methods needed by other services

  async getAccessibleUserIds(userId: string): Promise<string[]> {
    const userAccesses =
      await this.userAccessRepository.listUserAccesses(userId);
    return userAccesses.map((access: UserAccess) => access.targetUserId);
  }
}
