import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BusinessLogicException,
  InsufficientPermissionsException,
  ResourceNotFoundException,
} from '@/shared/common/exceptions/custom.exceptions';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { AccessControlHelperService } from './access-control-helper.service';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { CenterAccessRepository } from '../repositories/center-access.repository';
import { CenterAccessDto } from '../dto/center-access.dto';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { BranchAccessRepository } from '../repositories/branch-access.repository';
import { AccessControlEvents } from '@/modules/access-control/events/access-control.events';

@Injectable()
export class AccessControlService {
  constructor(
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userAccessRepository: UserAccessRepository,
    private readonly centerAccessRepository: CenterAccessRepository,
    private readonly branchAccessRepository: BranchAccessRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async grantUserAccess(body: UserAccessDto): Promise<void> {
    await this.userAccessRepository.grantUserAccess(body);
  }

  async grantUserAccessInternal(body: UserAccessDto): Promise<void> {
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
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: body.granterUserProfileId,
        centerId,
      });

    if (!IHaveAccessToGranterUser) {
      throw new InsufficientPermissionsException(
        'You do not have access to granter user',
      );
    }

    const IHaveAccessToTargetUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: body.targetUserProfileId,
        centerId,
      });

    if (!IHaveAccessToTargetUser) {
      throw new InsufficientPermissionsException(
        'You do not have access to target user',
      );
    }

    // check if target user have height role
    const isGranterSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(
        body.granterUserProfileId,
      );
    if (isGranterSuperAdmin) {
      throw new InsufficientPermissionsException(
        'Granter user is a super admin and can access any user',
      );
    }

    // Check if access already exists
    const canAccess = await this.accessControlHelperService.canUserAccess({
      granterUserProfileId: body.granterUserProfileId,
      targetUserProfileId: body.targetUserProfileId,
      centerId: body.centerId,
    });

    if (canAccess) {
      throw new BusinessLogicException('User already has access');
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
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: body.granterUserProfileId,
        centerId,
      });

    if (!IHaveAccessToGranterUser) {
      throw new InsufficientPermissionsException(
        'You do not have access to granter user',
      );
    }

    const IHaveAccessToTargetUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: body.targetUserProfileId,
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
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: dto.userProfileId,
      centerId: dto.centerId,
    });

    const result = await this.centerAccessRepository.grantCenterAccess(dto);

    return result;
  }

  async revokeCenterAccess(dto: CenterAccessDto, actor: ActorUser) {
    // Validate that the granter has permission to revoke access
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: dto.userProfileId,
      centerId: dto.centerId,
    });

    const result = await this.centerAccessRepository.revokeCenterAccess(dto);

    return result;
  }

  // Additional methods needed by other services

  async getAccessibleProfileIds(profileId: string): Promise<string[]> {
    const userAccesses =
      await this.userAccessRepository.listUserAccesses(profileId);
    return userAccesses.map((access: UserAccess) => access.targetUserProfileId);
  }

  async assignProfileToBranch(data: BranchAccessDto, actor: ActorUser) {
    const canAccess =
      await this.accessControlHelperService.canBranchAccess(data);
    if (canAccess) {
      throw new ConflictException('Profile already assigned to branch');
    }

    // Create new assignment
    const branchAccess =
      await this.branchAccessRepository.grantBranchAccess(data);

    return branchAccess;
  }

  async removeUserFromBranch(data: BranchAccessDto, actor: ActorUser) {
    await this.accessControlHelperService.validateBranchAccess(data);

    const result = await this.branchAccessRepository.revokeBranchAccess(data);

    return result;
  }

  async softRemoveCenterAccess(
    body: CenterAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerAccess =
      await this.accessControlHelperService.findCenterAccess(body);
    if (!centerAccess) {
      throw new ResourceNotFoundException('Center access not found');
    }
    if (centerAccess.deletedAt)
      throw new BusinessLogicException('Center access already deleted');

    await this.centerAccessRepository.softRemove(centerAccess.id);
  }

  async restoreCenterAccess(
    body: CenterAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerAccess =
      await this.accessControlHelperService.findCenterAccess(body);
    if (!centerAccess) {
      throw new ResourceNotFoundException('Center access not found');
    }
    if (!centerAccess.deletedAt)
      throw new BusinessLogicException('Center access not deleted');
    await this.centerAccessRepository.restore(centerAccess.id);
  }

  async activateCenterAccess(
    body: CenterAccessDto,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    console.log(body);
    const centerAccess =
      await this.accessControlHelperService.findCenterAccess(body);
    if (!centerAccess) {
      throw new ResourceNotFoundException('Center access not found');
    }
    await this.centerAccessRepository.update(centerAccess.id, { isActive });

    // Emit event for activity logging
  }
}
