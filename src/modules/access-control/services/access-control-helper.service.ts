import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  InsufficientPermissionsException,
  AdminScopeAccessDeniedException,
  CenterAccessDeniedException,
  CenterAccessInactiveException,
  InactiveCenterException,
} from '@/shared/common/exceptions/custom.exceptions';
import { In } from 'typeorm';
import { UserAccess } from '../entities/user-access.entity';
import { ProfileRoleRepository } from '../repositories/profile-role.repository';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { CenterAccessRepository } from '../repositories/center-access.repository';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { CenterAccessDto } from '../dto/center-access.dto';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { PermissionScope } from '../constants/permissions';
import { RolesService } from './roles.service';
import { CentersService } from '@/modules/centers/services/centers.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { CenterAccess } from '../entities/center-access.entity';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class AccessControlHelperService extends BaseService {
  private readonly logger: Logger = new Logger(AccessControlHelperService.name);

  constructor(
    private readonly profileRoleRepository: ProfileRoleRepository,
    private readonly userAccessRepository: UserAccessRepository,
    private readonly centerAccessRepository: CenterAccessRepository,
    private readonly centersService: CentersService,
    private readonly rolesService: RolesService,
    private readonly userProfileService: UserProfileService,
    @Inject(forwardRef(() => BranchAccessService))
    private readonly branchAccessService: BranchAccessService,
  ) {
    super();
  }

  /**
   * Validate if the user has admin or super admin access or center access
   * @param userId - The user id
   * @param centerId - The center id
   * @returns void
   */
  async validateAdminAndCenterAccess({
    userProfileId,
    centerId,
  }: {
    userProfileId: string;
    centerId?: string;
  }) {
    if (centerId) {
      await this.validateCenterAccess(
        {
          userProfileId,
          centerId,
        },
        {
          includeDeleted: false,
          includeInactive: false,
          includeDeletedCenter: false,
          includeInactiveCenter: false,
        },
      );

      return;
    } else {
      await this.validateAdminAccess({ userProfileId });
      return;
    }

    // now it doesn't allow access to any user that doesn't have SUPER_ADMIN role or have center access
  }

  /**
   * Validate if the user has admin or super admin access
   * @param userId - The user id
   * @returns void
   */
  async validateAdminAccess({ userProfileId }: { userProfileId: string }) {
    const isSuperAdmin = await this.isSuperAdmin(userProfileId);
    if (isSuperAdmin) {
      return;
    }
    const haveAdminRole = await this.isAdmin(userProfileId);
    if (haveAdminRole) {
      return;
    }
    this.logger.warn('Admin access validation failed', { userProfileId });
    throw new AdminScopeAccessDeniedException('t.errors.denied.access', {
      resource: 't.common.resources.adminScope',
    });
  }

  async getProfileRole(userProfileId: string, centerId?: string) {
    return this.profileRoleRepository.getProfileRole(userProfileId, centerId);
  }

  async getAccessibleProfilesIdsForUser(
    userProfileId: string,
    targetProfileIds: string[],
    centerId?: string,
  ): Promise<string[]> {
    return Promise.all(
      targetProfileIds.map(async (targetProfileId) => {
        const canAccess = await this.canUserAccess({
          granterUserProfileId: userProfileId,
          targetUserProfileId: targetProfileId,
          centerId,
        });
        return canAccess ? targetProfileId : null;
      }),
    ).then((results) => results.filter((result) => result !== null));
  }

  async getAccessibleProfilesIdsForCenter(
    centerId: string,
    targetProfileIds: string[],
  ): Promise<string[]> {
    return Promise.all(
      targetProfileIds.map(async (targetProfileId) => {
        const canAccess = await this.canCenterAccess({
          userProfileId: targetProfileId,
          centerId,
        });
        return canAccess ? targetProfileId : null;
      }),
    ).then((results) => results.filter((result) => result !== null));
  }

  /**
   * Get accessible profile IDs for a branch.
   * Delegates to BranchAccessService to maintain module boundaries.
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
    return this.branchAccessService.getAccessibleProfilesIdsForBranch(
      branchId,
      targetProfileIds,
      centerId,
    );
  }

  async getAccessibleProfilesIdsForRole(
    roleId: string,
    targetProfileIds: string[],
    centerId?: string,
  ): Promise<string[]> {
    const result = await this.profileRoleRepository.findMany({
      where: [
        {
          roleId,
          ...(centerId ? { centerId } : {}),
          userProfileId: In(targetProfileIds),
        },
      ],
    });
    return result.map((result) => result.userProfileId);
  }

  async getAccessibleCentersIdsForProfile(
    userProfileId: string,
    targetCenterIds: string[],
  ): Promise<string[]> {
    const result = await Promise.all(
      targetCenterIds.map(async (targetCenterId) => {
        const canAccess = await this.canCenterAccess({
          userProfileId,
          centerId: targetCenterId,
        });

        return canAccess ? targetCenterId : null;
      }),
    );
    return result.filter((result) => result !== null);
  }

  async getAccessibleRolesIdsForProfile(
    userProfileId: string,
    centerId?: string,
  ): Promise<string[]> {
    const profileRoles = await this.profileRoleRepository.findProfileRoles(
      userProfileId,
      centerId,
    );
    return profileRoles.map((profileRole) => profileRole.roleId);
  }

  // user access methods
  async findUserAccess(data: UserAccessDto): Promise<UserAccess | null> {
    return this.userAccessRepository.findUserAccess(data);
  }

  async canUserAccess(data: UserAccessDto): Promise<boolean> {
    const { granterUserProfileId, targetUserProfileId, centerId } = data;
    if (granterUserProfileId === targetUserProfileId) {
      return true;
    }
    const bypassUserAccess = await this.bypassCenterInternalAccess(
      granterUserProfileId,
      centerId,
    );
    if (bypassUserAccess) {
      return true;
    }
    const userAccess = await this.findUserAccess(data);
    return !!userAccess;
  }

  async validateUserAccess(data: UserAccessDto): Promise<void> {
    const userAccess = await this.canUserAccess(data);
    if (!userAccess) {
      this.logger.warn('User access validation failed', {
        granterUserProfileId: data.granterUserProfileId,
        targetUserProfileId: data.targetUserProfileId,
        centerId: data.centerId,
      });
      throw new InsufficientPermissionsException(
        't.errors.noAccessToTargetUser',
      );
    }
  }

  // center access methods

  async findCenterAccess(
    data: CenterAccessDto,
    isDeleted?: boolean,
  ): Promise<CenterAccess | null> {
    return this.centerAccessRepository.findCenterAccess(data, isDeleted);
  }

  async canCenterAccess(
    data: CenterAccessDto,
    isDeleted: boolean = true,
  ): Promise<boolean> {
    const { userProfileId } = data;
    const isSuperAdmin = await this.isSuperAdmin(userProfileId);
    if (isSuperAdmin) {
      return true;
    }

    const centerAccess = await this.findCenterAccess(data, isDeleted);
    return !!centerAccess;
  }

  async validateCenterAccess(
    data: CenterAccessDto,
    config: {
      includeDeleted?: boolean;
      includeInactive?: boolean;
      includeDeletedCenter?: boolean;
      includeInactiveCenter?: boolean;
    } = {
      includeDeleted: true,
      includeInactive: true,
      includeDeletedCenter: true,
      includeInactiveCenter: true,
    },
  ): Promise<void> {
    // Check if center exists (and is active if not deleted)
    const center = await this.centersService.findCenterById(
      data.centerId,
      undefined,
      config.includeDeletedCenter,
    );

    // Only check if center is active if:
    // 1. Center is not deleted
    // 2. includeInactiveCenter is false (by default allows inactive centers)
    if (
      !config.includeDeletedCenter &&
      !center.isActive &&
      !config.includeInactiveCenter
    ) {
      this.logger.warn(
        'Center validation failed - the center itself is inactive',
        {
          userProfileId: data.userProfileId,
          centerId: data.centerId,
          centerName: center.name,
        },
      );
      throw new InactiveCenterException('t.errors.centerInactive.description');
    }

    // Check if user has access to the center

    const canAccess = await this.canCenterAccess(data, config.includeDeleted);
    if (!canAccess) {
      this.logger.warn('Center access validation failed', {
        userProfileId: data.userProfileId,
        centerId: data.centerId,
      });
      throw new CenterAccessDeniedException(
        't.errors.centerAccessDenied.description',
      );
    }
    const centerAccess = await this.findCenterAccess(data);
    if (!centerAccess) return;

    // Check if the user's access to the center is active
    if (!centerAccess.isActive && !config.includeInactive) {
      this.logger.warn('Center access validation failed - access is inactive', {
        userProfileId: data.userProfileId,
        centerId: data.centerId,
      });
      throw new CenterAccessInactiveException(
        't.errors.centerAccessInactive.description',
      );
    }
  }

  async isSuperAdmin(userProfileId: string) {
    return this.profileRoleRepository.isSuperAdmin(userProfileId);
  }

  async isCenterOwner(userProfileId: string, centerId: string) {
    return this.profileRoleRepository.isCenterOwner(userProfileId, centerId);
  }

  async isAdmin(userProfileId: string) {
    return this.userProfileService.isAdmin(userProfileId);
  }

  async isStaff(userProfileId: string) {
    return this.userProfileService.isStaff(userProfileId);
  }

  async bypassCenterInternalAccess(
    userProfileId: string,
    centerId?: string,
  ): Promise<boolean> {
    const isSuperAdmin = await this.isSuperAdmin(userProfileId);
    if (isSuperAdmin) {
      return true;
    }
    if (centerId) {
      const isCenterOwner = await this.isCenterOwner(userProfileId, centerId);
      if (isCenterOwner) {
        return true;
      }
      const centerAccess = await this.centerAccessRepository.findCenterAccess({
        userProfileId,
        centerId,
      });
      if (centerAccess) {
        const haveAdminRole = await this.isAdmin(userProfileId);
        if (haveAdminRole) {
          return true;
        }
      }
    }
    return false;
  }
  async findUserProfile(userProfileId: string) {
    return this.userProfileService.findOne(userProfileId);
  }

  async hasPermission(
    userProfileId: string,
    permission: string,
    scope: PermissionScope,
    centerId?: string,
  ) {
    return this.rolesService.hasPermission(
      userProfileId,
      permission,
      scope,
      centerId,
    );
  }
}
