import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CentersErrors } from '../exceptions/centers.errors';
import { UserProfileErrors } from '@/modules/user-profile/exceptions/user-profile.errors';
import { BaseService } from '@/shared/common/services/base.service';
import { BranchAccessRepository } from '../repositories/branch-access.repository';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { BranchAccess } from '../entities/branch-access.entity';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AccessControlCacheService } from '@/shared/common/services/access-control-cache.service';
import { CentersService } from './centers.service';
import { BranchesService } from './branches.service';
import { SelfProtectionService } from '@/shared/common/services/self-protection.service';
import { RoleHierarchyService } from '@/shared/common/services/role-hierarchy.service';

@Injectable()
export class BranchAccessService extends BaseService {
  private readonly logger: Logger = new Logger(BranchAccessService.name);

  constructor(
    private readonly branchAccessRepository: BranchAccessRepository,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userProfileService: UserProfileService,
    private readonly centersService: CentersService,
    private readonly branchesService: BranchesService,
    private readonly selfProtectionService: SelfProtectionService,
    private readonly roleHierarchyService: RoleHierarchyService,
  ) {
    super();
  }

  /**
   * Find branch access assignment for a specific user and branch.
   *
   * @param data - BranchAccessDto containing userProfileId, centerId, and branchId
   * @returns BranchAccess assignment or null if not found
   */
  async findBranchAccess(data: BranchAccessDto): Promise<BranchAccess | null> {
    const { userProfileId, centerId, branchId } = data;
    // Defensive check: verify cache exists
    const cached = AccessControlCacheService.getBranchAccess(
      userProfileId,
      centerId,
      branchId,
    );
    if (cached !== undefined && cached.branchAccess !== undefined) {
      return cached.branchAccess;
    }

    // Not cached - query repository
    const branchAccess =
      await this.branchAccessRepository.findBranchAccess(data);

    // Cache null values explicitly to avoid repeated queries for non-existent records
    AccessControlCacheService.setBranchAccess(
      userProfileId,
      centerId,
      branchId,
      {
        ...cached,
        branchAccess,
      },
    );

    return branchAccess;
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
      throw CentersErrors.branchAccessDenied();
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
    // Early return: if empty array, return []
    if (targetProfileIds.length === 0) {
      return [];
    }

    // Batch load: Use findManyBranchAccess to load all branch access records in one query
    const queries = targetProfileIds.map((userProfileId) => ({
      userProfileId,
      centerId,
      branchId,
    }));
    const branchAccesses =
      await this.branchAccessRepository.findManyBranchAccess(queries);

    // Cache results: Store each record in branch access cache (including nulls)
    const accessibleSet = new Set<string>();
    const processedProfileIds = new Set<string>();

    for (const branchAccess of branchAccesses) {
      accessibleSet.add(branchAccess.userProfileId);
      processedProfileIds.add(branchAccess.userProfileId);
      // Cache the branch access
      AccessControlCacheService.setBranchAccess(
        branchAccess.userProfileId,
        branchAccess.centerId,
        branchAccess.branchId,
        {
          branchAccess,
          hasBranchAccess: true,
        },
      );
    }

    // Cache nulls for profiles that don't have branch access
    for (const targetProfileId of targetProfileIds) {
      if (!processedProfileIds.has(targetProfileId)) {
        AccessControlCacheService.setBranchAccess(
          targetProfileId,
          centerId,
          branchId,
          {
            branchAccess: null,
            hasBranchAccess: false,
          },
        );
      }
    }

    // Check bypass: For profiles not in accessible set, check bypass (now cached) individually
    const results: string[] = [];
    for (const targetProfileId of targetProfileIds) {
      if (accessibleSet.has(targetProfileId)) {
        results.push(targetProfileId);
      } else {
        // Check bypass access (now cached)
        const canAccess = await this.canBranchAccess({
          userProfileId: targetProfileId,
          centerId,
          branchId,
        });
        if (canAccess) {
          results.push(targetProfileId);
        }
      }
    }

    return results;
  }

  /**
   * Assigns a profile to a branch.
   * Validates user access, profile type, and creates branch access assignment.
   *
   * @param data - BranchAccessDto containing userProfileId, centerId, and branchId
   * @param actor - The user performing the action
   * @returns Created BranchAccess assignment
   * @throws CommonErrors.emergencyNotFound() if profile doesn't exist
   * @throws CentersErrors.profileInvalidTypeForBranchAccess() if profile is not STAFF/ADMIN or already assigned
   */
  async assignProfileToBranch(
    data: BranchAccessDto,
    actor: ActorUser,
  ): Promise<BranchAccess> {
    // Self-protection check - applies to ALL operations
    this.selfProtectionService.validateNotSelf(
      actor.userProfileId,
      data.userProfileId,
    );

    data.centerId = data.centerId ?? actor.centerId ?? '';

    // Role hierarchy check (use data.centerId or actor.centerId, should always be available for branch operations)
    await this.roleHierarchyService.validateCanOperateOnUser(
      actor.userProfileId,
      data.userProfileId,
      data.centerId, // Should always be available for branch operations
    );

    // Validate actor has access to the branch (to grant access to others)
    await this.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: data.branchId,
    });

    const profile = await this.userProfileService.findOne(data.userProfileId);
    if (!profile) {
      throw UserProfileErrors.userProfileNotFound();
    }

    // Validate user profile is active
    if (!profile.isActive) {
      throw UserProfileErrors.userProfileInactive();
    }

    if (
      profile.profileType !== ProfileType.STAFF &&
      profile.profileType !== ProfileType.ADMIN
    ) {
      throw CentersErrors.profileInvalidTypeForBranchAccess();
    }

    // Validate center is active
    const center = await this.centersService.findCenterById(
      data.centerId,
      actor,
    );
    if (!center.isActive) {
      throw CentersErrors.centerInactive();
    }

    // Validate branch is active
    const branch = await this.branchesService.getBranch(data.branchId, actor);
    if (!branch.isActive) {
      throw CentersErrors.branchInactive();
    }

    const canAccess = await this.canBranchAccess(data);
    if (canAccess) {
      throw CentersErrors.profileInvalidTypeForBranchAccess();
    }

    return await this.branchAccessRepository.grantBranchAccess(data);
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
    // Self-protection check - applies to ALL operations
    this.selfProtectionService.validateNotSelf(
      actor.userProfileId,
      data.userProfileId,
    );

    data.centerId = data.centerId ?? actor.centerId ?? '';

    // Role hierarchy check (use data.centerId or actor.centerId, should always be available for branch operations)
    await this.roleHierarchyService.validateCanOperateOnUser(
      actor.userProfileId,
      data.userProfileId,
      data.centerId, // Should always be available for branch operations
    );

    // Validate actor has access to the branch (to revoke access from others)
    await this.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: data.branchId,
    });

    // Validate target user has branch access (to revoke)
    await this.validateBranchAccess(data);

    return await this.branchAccessRepository.revokeBranchAccess(data);
  }
}
