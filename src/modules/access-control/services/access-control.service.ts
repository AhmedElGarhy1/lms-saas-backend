import { ConflictException, Injectable } from '@nestjs/common';
import { InsufficientPermissionsException } from '@/shared/common/exceptions/custom.exceptions';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { AccessControlHelperService } from './access-control-helper.service';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { CenterAccessRepository } from '../repositories/center-access.repository';
import { CenterAccessDto } from '../dto/center-access.dto';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { BranchAccessRepository } from '../repositories/branch-access.repository';

@Injectable()
export class AccessControlService {
  constructor(
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userAccessRepository: UserAccessRepository,
    private readonly centerAccessRepository: CenterAccessRepository,
    private readonly branchAccessRepository: BranchAccessRepository,
  ) {}

  async grantUserAccess(body: UserAccessDto): Promise<void> {
    await this.userAccessRepository.grantUserAccess(body);
  }

  async revokeUserAccess(body: UserAccessDto): Promise<void> {
    await this.userAccessRepository.revokeUserAccess(body);
  }

  async grantUserAccessValidate(
    body: UserAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId;
    body.centerId = centerId;
    // Check user already have access
    const IHaveAccessToGranterUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: actor.id,
        targetUserId: body.granterUserId,
        centerId,
      });

    if (!IHaveAccessToGranterUser) {
      throw new InsufficientPermissionsException(
        'You do not have access to granter user',
      );
    }

    const IHaveAccessToTargetUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: actor.id,
        targetUserId: body.targetUserId,
        centerId,
      });

    if (!IHaveAccessToTargetUser) {
      throw new InsufficientPermissionsException(
        'You do not have access to target user',
      );
    }

    // check if target user have height role
    const isGranterSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(body.granterUserId);
    if (isGranterSuperAdmin) {
      throw new InsufficientPermissionsException(
        'Granter user is a super admin and can access any user',
      );
    }

    // Check if access already exists
    const canAccess = await this.accessControlHelperService.canUserAccess({
      granterUserId: body.granterUserId,
      targetUserId: body.targetUserId,
      centerId: body.centerId,
    });

    if (canAccess) {
      throw new InsufficientPermissionsException('User already has access');
    }

    await this.grantUserAccess(body);
  }

  async revokeUserAccessValidate(
    body: UserAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId;
    body.centerId = centerId;
    // Check user already have access
    const IHaveAccessToGranterUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: actor.id,
        targetUserId: body.granterUserId,
        centerId,
      });

    if (!IHaveAccessToGranterUser) {
      throw new InsufficientPermissionsException(
        'You do not have access to granter user',
      );
    }

    const IHaveAccessToTargetUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserId: actor.id,
        targetUserId: body.targetUserId,
        centerId,
      });

    if (!IHaveAccessToTargetUser) {
      throw new InsufficientPermissionsException(
        'You do not have access to target user',
      );
    }

    // Check if access exists
    const canAccess = await this.accessControlHelperService.canUserAccess(body);

    if (!canAccess) {
      throw new InsufficientPermissionsException('User does not have access');
    }

    await this.revokeUserAccess(body);
  }

  // Center Access Management Methods

  async grantCenterAccess(dto: CenterAccessDto, actor: ActorUser) {
    // Validate that the granter has permission to grant access
    await this.accessControlHelperService.validateUserAccess({
      granterUserId: actor.id,
      targetUserId: dto.userId,
      centerId: dto.centerId,
    });
    return this.centerAccessRepository.grantCenterAccess(dto);
  }

  async revokeCenterAccess(dto: CenterAccessDto, actor: ActorUser) {
    // Validate that the granter has permission to revoke access
    await this.accessControlHelperService.validateUserAccess({
      granterUserId: actor.id,
      targetUserId: dto.userId,
      centerId: dto.centerId,
    });

    return this.centerAccessRepository.revokeCenterAccess(dto);
  }

  // Additional methods needed by other services

  async getAccessibleUserIds(userId: string): Promise<string[]> {
    const userAccesses =
      await this.userAccessRepository.listUserAccesses(userId);
    return userAccesses.map((access: UserAccess) => access.targetUserId);
  }

  async assignUserToBranch(data: BranchAccessDto) {
    const canAccess =
      await this.accessControlHelperService.canBranchAccess(data);
    if (canAccess) {
      throw new ConflictException('User already assigned to branch');
    }

    // Create new assignment
    const branchAccess =
      await this.branchAccessRepository.grantBranchAccess(data);

    return branchAccess;
  }

  async removeUserFromBranch(data: BranchAccessDto) {
    await this.accessControlHelperService.validateBranchAccess(data);

    return this.branchAccessRepository.revokeBranchAccess(data);
  }
}
