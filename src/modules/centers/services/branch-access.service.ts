import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  BranchAccessDeniedException,
  BusinessLogicException,
  ResourceNotFoundException,
} from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { BranchAccessRepository } from '../repositories/branch-access.repository';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { BranchAccess } from '../entities/branch-access.entity';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class BranchAccessService extends BaseService {
  private readonly logger: Logger = new Logger(BranchAccessService.name);

  constructor(
    private readonly branchAccessRepository: BranchAccessRepository,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userProfileService: UserProfileService,
  ) {
    super();
  }

  /**
   * Find branch access assignment for a specific user and branch.
   *
   * @param data - BranchAccessDto containing userProfileId, centerId, and branchId
   * @returns BranchAccess assignment or null if not found
   */
  findBranchAccess(data: BranchAccessDto): Promise<BranchAccess | null> {
    return this.branchAccessRepository.findBranchAccess(data);
  }

  /**
   * Check if a user has branch access.
   * Returns true if user has bypass access (super admin, center owner, admin with center access) or has active branch access.
   *
   * @param data - BranchAccessDto containing userProfileId, centerId, and branchId
   * @returns true if user has access, false otherwise
   */
  async canBranchAccess(data: BranchAccessDto): Promise<boolean> {
    const bypassBranchAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        data.userProfileId,
        data.centerId,
      );
    if (bypassBranchAccess) {
      return true;
    }
    const branchAccess = await this.findBranchAccess(data);
    return !!branchAccess;
  }

  /**
   * Validates that a user has branch access.
   * Throws BranchAccessDeniedException if access is denied.
   *
   * @param data - BranchAccessDto containing userProfileId, centerId, and branchId
   * @throws BranchAccessDeniedException if user doesn't have branch access
   */
  async validateBranchAccess(data: BranchAccessDto): Promise<void> {
    const branchAccess = await this.canBranchAccess(data);
    if (!branchAccess) {
      this.logger.warn('Branch access validation failed', {
        userProfileId: data.userProfileId,
        centerId: data.centerId,
        branchId: data.branchId,
      });
      throw new BranchAccessDeniedException('t.errors.denied.access', {
        resource: 't.common.resources.branch',
      });
    }
  }

  /**
   * Get accessible profile IDs for a branch.
   * Filters an array of profile IDs to return only those that have branch access.
   *
   * @param branchId - The branch ID
   * @param targetProfileIds - Array of profile IDs to check
   * @param centerId - The center ID
   * @returns Array of profile IDs that have branch access
   */
  async getAccessibleProfilesIdsForBranch(
    branchId: string,
    targetProfileIds: string[],
    centerId: string,
  ): Promise<string[]> {
    return Promise.all(
      targetProfileIds.map(async (targetProfileId) => {
        const canAccess = await this.canBranchAccess({
          userProfileId: targetProfileId,
          centerId,
          branchId,
        });
        return canAccess ? targetProfileId : null;
      }),
    ).then((results) => results.filter((result) => result !== null));
  }

  /**
   * Assigns a profile to a branch.
   * Validates user access, profile type, and creates branch access assignment.
   *
   * @param data - BranchAccessDto containing userProfileId, centerId, and branchId
   * @param actor - The user performing the action
   * @returns Created BranchAccess assignment
   * @throws ResourceNotFoundException if profile doesn't exist
   * @throws BusinessLogicException if profile is not STAFF/ADMIN or already assigned
   */
  async assignProfileToBranch(
    data: BranchAccessDto,
    actor: ActorUser,
  ): Promise<BranchAccess> {
    const centerId = data.centerId ?? actor.centerId ?? '';

    // Validate access (can actor manage this profile?)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId,
    });

    // Validate that profile type is STAFF or ADMIN
    const profile = await this.userProfileService.findOne(data.userProfileId);
    if (!profile) {
      throw new ResourceNotFoundException('t.errors.notFound.generic', {
        resource: 't.common.resources.profile',
      });
    }

    // Positive check: must be STAFF or ADMIN
    if (
      profile.profileType !== ProfileType.STAFF &&
      profile.profileType !== ProfileType.ADMIN
    ) {
      throw new BusinessLogicException('t.errors.onlyForStaffAndAdmin', {
        resource: 't.common.resources.branchAccess',
      });
    }

    const canAccess = await this.canBranchAccess(data);
    if (canAccess) {
      throw new BusinessLogicException('t.errors.already.is', {
        resource: 't.common.labels.profile',
        state: 't.common.messages.assignedToBranch',
      });
    }

    // Create new assignment
    const branchAccess =
      await this.branchAccessRepository.grantBranchAccess(data);

    return branchAccess;
  }

  /**
   * Removes a profile from a branch.
   * Validates user access and removes branch access assignment.
   *
   * @param data - BranchAccessDto containing userProfileId, centerId, and branchId
   * @param actor - The user performing the action
   * @returns Removed BranchAccess assignment
   */
  async removeProfileFromBranch(
    data: BranchAccessDto,
    actor: ActorUser,
  ): Promise<BranchAccess> {
    const centerId = data.centerId ?? actor.centerId ?? '';

    // Validate access (can actor manage this profile?)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId,
    });

    await this.validateBranchAccess(data);

    const result = await this.branchAccessRepository.revokeBranchAccess(data);

    return result;
  }
}
