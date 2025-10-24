import { Inject, Injectable } from '@nestjs/common';
import {
  InsufficientPermissionsException,
  AdminScopeAccessDeniedException,
  CenterAccessDeniedException,
  BranchAccessDeniedException,
} from '@/shared/common/exceptions/custom.exceptions';
import { In } from 'typeorm';
import { ProfileRole } from '../entities/profile-role.entity';
import { Role } from '../entities/role.entity';
import { UserAccess } from '../entities/user-access.entity';
import { ProfileRoleRepository } from '../repositories/profile-role.repository';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { Center } from '@/modules/centers/entities/center.entity';
import { CenterAccessRepository } from '../repositories/center-access.repository';
import { BranchAccess } from '@/modules/access-control/entities/branch-access.entity';
import { BranchAccessRepository } from '../repositories/branch-access.repository';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { CenterAccessDto } from '../dto/center-access.dto';

@Injectable()
export class AccessControlHelperService {
  constructor(
    @Inject(ProfileRoleRepository)
    private profileRoleRepository: ProfileRoleRepository,
    private userAccessRepository: UserAccessRepository,
    private centerAccessRepository: CenterAccessRepository,
    private branchAccessRepository: BranchAccessRepository,
  ) {}

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
      await this.validateCenterAccess({
        userProfileId,
        centerId,
      });

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
    const haveAdminRole = await this.hasAdminRole(userProfileId);
    if (haveAdminRole) {
      return;
    }
    throw new AdminScopeAccessDeniedException(
      'You do not have access to admin scope. Please select a center to access center-specific resources.',
    );
  }

  async getUserCenters(userProfileId: string) {
    // Get centers from user's roles (centerId in userRoles = center access)
    const profileRoles = await this.profileRoleRepository.findMany({
      where: { userProfileId },
      relations: ['role', 'role.center'],
    });
    const _profileRoles = profileRoles as (ProfileRole & {
      role?: Role & { center?: Center };
    })[];

    // Extract unique center IDs from roles
    const centerIds = _profileRoles
      .map((profileRole) => profileRole?.role?.center?.id)
      .filter((centerId) => centerId !== null);

    return centerIds;
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
      throw new InsufficientPermissionsException(
        'You do not have access to target user',
      );
    }
  }

  // center access methods

  async canCenterAccess(data: CenterAccessDto): Promise<boolean> {
    const { userProfileId } = data;
    const isSuperAdmin = await this.isSuperAdmin(userProfileId);
    if (isSuperAdmin) {
      return true;
    }

    const centerAccess =
      await this.centerAccessRepository.findCenterAccess(data);
    return !!centerAccess;
  }

  async validateCenterAccess(data: CenterAccessDto): Promise<void> {
    const centerAccess = await this.canCenterAccess(data);
    if (!centerAccess) {
      throw new CenterAccessDeniedException(
        'You do not have access to this center',
      );
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
      throw new BranchAccessDeniedException();
    }
  }

  async isSuperAdmin(userProfileId: string) {
    return this.profileRoleRepository.isSuperAdmin(userProfileId);
  }

  async isCenterOwner(userProfileId: string, centerId: string) {
    return this.profileRoleRepository.isCenterOwner(userProfileId, centerId);
  }

  async hasAdminRole(userProfileId: string) {
    return this.profileRoleRepository.hasAdminRole(userProfileId);
  }

  async hasUserRole(userProfileId: string) {
    return this.profileRoleRepository.hasUserRole(userProfileId);
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
        const haveAdminRole = await this.hasAdminRole(userProfileId);
        if (haveAdminRole) {
          return true;
        }
      }
    }
    return false;
  }
}
