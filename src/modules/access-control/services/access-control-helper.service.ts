import { Injectable, Logger } from '@nestjs/common';
import {
  InsufficientPermissionsException,
  AdminScopeAccessDeniedException,
  CenterAccessDeniedException,
  CenterAccessInactiveException,
  InactiveCenterException,
  BranchAccessDeniedException,
} from '@/shared/common/exceptions/custom.exceptions';
import { In } from 'typeorm';
import { UserAccess } from '../entities/user-access.entity';
import { ProfileRoleRepository } from '../repositories/profile-role.repository';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { CenterAccessRepository } from '../repositories/center-access.repository';
import { BranchAccess } from '@/modules/access-control/entities/branch-access.entity';
import { BranchAccessRepository } from '../repositories/branch-access.repository';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { CenterAccessDto } from '../dto/center-access.dto';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { PermissionScope } from '../constants/permissions';
import { RolesService } from './roles.service';
import { CentersService } from '@/modules/centers/services/centers.service';
import { CenterAccess } from '../entities/center-access.entity';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class AccessControlHelperService extends BaseService {
  private readonly logger: Logger = new Logger(AccessControlHelperService.name);

  constructor(
    private readonly profileRoleRepository: ProfileRoleRepository,
    private readonly userAccessRepository: UserAccessRepository,
    private readonly centerAccessRepository: CenterAccessRepository,
    private readonly branchAccessRepository: BranchAccessRepository,
    private readonly centersService: CentersService,
    private readonly rolesService: RolesService,
    private readonly userProfileService: UserProfileService,
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
        { includeDeleted: false, includeInactive: false },
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
    throw new AdminScopeAccessDeniedException(
      'You do not have access to admin scope. Please select a center to access center-specific resources.',
    );
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
        'You do not have access to target user',
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
    isDeleted?: boolean,
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
    } = {
      includeDeleted: false,
      includeInactive: true,
    },
  ): Promise<void> {
    // Check if center is active
    const center = await this.centersService.findCenterById(data.centerId);

    if (!center.isActive) {
      this.logger.warn('Center access validation failed - center is inactive', {
        userProfileId: data.userProfileId,
        centerId: data.centerId,
      });
      throw new InactiveCenterException();
    }

    // Check if user has access to the center

    const canAccess = await this.canCenterAccess(data, config.includeDeleted);
    if (!canAccess) {
      this.logger.warn('Center access validation failed', {
        userProfileId: data.userProfileId,
        centerId: data.centerId,
      });
      throw new CenterAccessDeniedException();
    }
    const centerAccess = await this.findCenterAccess(data);
    if (!centerAccess) return;

    // Check if the user's access to the center is active
    if (!centerAccess.isActive && !config.includeInactive) {
      this.logger.warn('Center access validation failed - access is inactive', {
        userProfileId: data.userProfileId,
        centerId: data.centerId,
      });
      throw new CenterAccessInactiveException();
    }
  }

  findBranchAccess(data: BranchAccessDto): Promise<BranchAccess | null> {
    return this.branchAccessRepository.findBranchAccess(data);
  }

  async canBranchAccess(data: BranchAccessDto): Promise<boolean> {
    const bypassBranchAccess = await this.bypassCenterInternalAccess(
      data.userProfileId,
      data.centerId,
    );
    if (bypassBranchAccess) {
      return true;
    }
    const branchAccess = await this.findBranchAccess(data);
    return !!branchAccess;
  }

  async validateBranchAccess(data: BranchAccessDto): Promise<void> {
    const branchAccess = await this.canBranchAccess(data);
    if (!branchAccess) {
      this.logger.warn('Branch access validation failed', {
        userProfileId: data.userProfileId,
        centerId: data.centerId,
        branchId: data.branchId,
      });
      throw new BranchAccessDeniedException();
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
