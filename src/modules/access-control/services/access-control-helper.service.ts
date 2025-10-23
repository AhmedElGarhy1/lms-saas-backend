import { Inject, Injectable } from '@nestjs/common';
import {
  InsufficientPermissionsException,
  AdminScopeAccessDeniedException,
  CenterAccessDeniedException,
  BranchAccessDeniedException,
} from '@/shared/common/exceptions/custom.exceptions';
import { In } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { UserAccess } from '../entities/user-access.entity';
import { UserRoleRepository } from '../repositories/user-role.repository';
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
    @Inject(UserRoleRepository)
    private userRoleRepository: UserRoleRepository,
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
    userId,
    centerId,
    profileType,
  }: {
    userId: string;
    profileType: ProfileType;
    centerId?: string;
  }) {
    if (centerId) {
      await this.validateCenterAccess({
        userId,
        centerId,
        profileType,
      });

      return;
    } else {
      await this.validateAdminAccess({ userId });
      return;
    }

    // now it doesn't allow access to any user that doesn't have SUPER_ADMIN role or have center access
  }

  /**
   * Validate if the user has admin or super admin access
   * @param userId - The user id
   * @returns void
   */
  async validateAdminAccess({ userId }: { userId: string }) {
    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return;
    }
    const haveAdminRole = await this.hasAdminRole(userId);
    if (haveAdminRole) {
      return;
    }
    throw new AdminScopeAccessDeniedException(
      'You do not have access to admin scope. Please select a center to access center-specific resources.',
    );
  }

  async getUserCenters(userId: string) {
    // Get centers from user's roles (centerId in userRoles = center access)
    const userRoles = await this.userRoleRepository.findMany({
      where: { userId },
      relations: ['role', 'role.center'],
    });
    const _userRoles = userRoles as (UserRole & {
      role?: Role & { center?: Center };
    })[];

    // Extract unique center IDs from roles
    const centerIds = _userRoles
      .map((userRole) => userRole?.role?.center?.id)
      .filter((centerId) => centerId !== null);

    return centerIds;
  }

  async getUserRole(userId: string, centerId?: string) {
    return this.userRoleRepository.getUserRole(userId, centerId);
  }

  async getAccessibleUsersIdsForUser(
    userId: string,
    targetUserIds: string[],
    centerId?: string,
  ): Promise<string[]> {
    return Promise.all(
      targetUserIds.map(async (targetUserId) => {
        const canAccess = await this.canUserAccess({
          granterUserId: userId,
          targetUserId,
          centerId,
        });
        return canAccess ? targetUserId : null;
      }),
    ).then((results) => results.filter((result) => result !== null));
  }

  async getAccessibleUsersIdsForCenter(
    centerId: string,
    targetUserIds: string[],
    profileType: ProfileType,
  ): Promise<string[]> {
    return Promise.all(
      targetUserIds.map(async (targetUserId) => {
        const canAccess = await this.canCenterAccess({
          userId: targetUserId,
          centerId,
          profileType,
        });
        return canAccess ? targetUserId : null;
      }),
    ).then((results) => results.filter((result) => result !== null));
  }
  async getAccessibleUsersIdsForBranch(
    branchId: string,
    targetUserIds: string[],
    centerId: string,
  ): Promise<string[]> {
    return Promise.all(
      targetUserIds.map(async (targetUserId) => {
        const canAccess = await this.canBranchAccess({
          userId: targetUserId,
          centerId,
          branchId,
        });
        return canAccess ? targetUserId : null;
      }),
    ).then((results) => results.filter((result) => result !== null));
  }

  async getAccessibleUsersIdsForRole(
    roleId: string,
    targetUserIds: string[],
    centerId?: string,
  ): Promise<string[]> {
    const result = await this.userRoleRepository.findMany({
      where: [
        {
          roleId,
          ...(centerId ? { centerId } : {}),
          userId: In(targetUserIds),
        },
      ],
    });
    return result.map((result) => result.userId);
  }

  async getAccessibleCentersIdsForUser(
    userId: string,
    targetCenterIds: string[],
  ): Promise<string[]> {
    const result = await Promise.all(
      targetCenterIds.map(async (targetCenterId) => {
        // TODO: use profile type correctly
        const canAccessStaff = await this.canCenterAccess({
          userId,
          centerId: targetCenterId,
          profileType: ProfileType.STAFF,
        });
        const canAccessAdmin = await this.canCenterAccess({
          userId,
          centerId: targetCenterId,
          profileType: ProfileType.ADMIN,
        });
        return canAccessStaff || canAccessAdmin ? targetCenterId : null;
      }),
    );
    return result.filter((result) => result !== null);
  }

  async getAccessibleRolesIdsForUser(
    userId: string,
    centerId?: string,
  ): Promise<string[]> {
    const userRoles = await this.userRoleRepository.findUserRoles(
      userId,
      centerId,
    );
    return userRoles.map((userRole) => userRole.roleId);
  }
  // user access methods
  async findUserAccess(data: UserAccessDto): Promise<UserAccess | null> {
    return this.userAccessRepository.findUserAccess(data);
  }

  async canUserAccess(data: UserAccessDto): Promise<boolean> {
    const { granterUserId, targetUserId, centerId } = data;
    if (granterUserId === targetUserId) {
      return true;
    }
    const bypassUserAccess = await this.bypassCenterInternalAccess(
      granterUserId,
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
    const { userId } = data;
    const isSuperAdmin = await this.isSuperAdmin(userId);
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
      data.userId,
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

  async isSuperAdmin(userId: string) {
    return this.userRoleRepository.isSuperAdmin(userId);
  }

  async isCenterOwner(userId: string, centerId: string) {
    return this.userRoleRepository.isCenterOwner(userId, centerId);
  }

  async hasAdminRole(userId: string) {
    return this.userRoleRepository.hasAdminRole(userId);
  }

  async hasUserRole(userId: string) {
    return this.userRoleRepository.hasUserRole(userId);
  }

  async bypassCenterInternalAccess(
    userId: string,
    centerId?: string,
  ): Promise<boolean> {
    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return true;
    }
    if (centerId) {
      const isCenterOwner = await this.isCenterOwner(userId, centerId);
      if (isCenterOwner) {
        return true;
      }
      const centerAccess = await this.centerAccessRepository.findCenterAccess({
        userId,
        centerId,
        profileType: ProfileType.STAFF,
      });
      if (centerAccess) {
        const haveAdminRole = await this.hasAdminRole(userId);
        if (haveAdminRole) {
          return true;
        }
      }
    }
    return false;
  }
}
