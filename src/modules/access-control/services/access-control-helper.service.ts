import { ForbiddenException, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { UserRole } from '../entities/roles/user-role.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { UserAccessParams } from '../interfaces/user-access.params';
import { CenterAccessParams } from '../interfaces/center-access.params';
import { Role } from '../entities';
import { Center } from '@/modules/centers/entities/center.entity';

@Injectable()
export class AccessControlHelperService {
  constructor(
    private userRoleRepository: UserRoleRepository,
    private userAccessRepository: UserAccessRepository,
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
  }: {
    userId: string;
    centerId?: string;
  }) {
    const heighesUsertRole =
      await this.userRoleRepository.getUserRoleWithFallback(userId, centerId);
    const heightestRole = heighesUsertRole?.role?.type;
    if (heightestRole === RoleType.SUPER_ADMIN) {
      return;
    }
    if (centerId) {
      await this.validateCenterAccess({
        userId,
        centerId,
      });
      return;
    } else {
      if (heightestRole !== RoleType.ADMIN) {
        throw new ForbiddenException('You do not have global access');
      }
    }

    // now it doesn't allow access to any user that doesn't have SUPER_ADMIN role or have center access
  }

  /**
   * Validate if the user has admin or super admin access
   * @param userId - The user id
   * @returns void
   */
  async validateAdminAccess({ userId }: { userId: string }) {
    const heighesUsertRole = await this.getUserRole(userId);
    const heightestRole = heighesUsertRole?.role?.type;
    if (
      ![RoleType.SUPER_ADMIN, RoleType.ADMIN].includes(
        heightestRole as RoleType,
      )
    ) {
      throw new ForbiddenException('You do not have access');
    }
  }

  async userHasRoleType(userId: string, roleType: string, centerId?: string) {
    return this.userRoleRepository.userHasRoleType(userId, roleType, centerId);
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
    const userRole = await this.getUserRole(userId, centerId);
    const roleType = userRole?.role?.type;
    if (roleType === RoleType.SUPER_ADMIN) {
      return targetUserIds;
    } else if (roleType === RoleType.CENTER_ADMIN) {
      if (centerId) {
        const canAccessCenter = await this.canCenterAccess({
          userId,
          centerId,
        });
        return canAccessCenter ? targetUserIds : [];
      } else return [];
    } else if (roleType === RoleType.ADMIN) {
      if (centerId) {
        const canAccessCenter = await this.canCenterAccess({
          userId,
          centerId,
        });
        return canAccessCenter ? targetUserIds : [];
      }
    }

    const userAccesses = await this.userAccessRepository.findMany({
      where: {
        granterUserId: userId,
        targetUserId: In(targetUserIds),
        ...(centerId && { centerId }),
      },
    });
    return userAccesses.map((access) => access.targetUserId);
  }

  // TODO: try to optimize this method
  async getAccessibleUsersIdsForCenter(
    centerId: string,
    targetUserIds: string[],
  ): Promise<string[]> {
    const result = await Promise.all(
      targetUserIds.map(async (targetUserId) => {
        const canAccess = await this.canCenterAccess({
          userId: targetUserId,
          centerId,
        });
        return canAccess ? targetUserId : null;
      }),
    );
    return result.filter((result) => result !== null);
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
        {
          roleId,
          ...(centerId ? { centerId } : {}),
          role: {
            type: RoleType.SUPER_ADMIN,
          },
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
        const canAccess = await this.canCenterAccess({
          userId,
          centerId: targetCenterId,
        });
        return canAccess ? targetCenterId : null;
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
  async findUserAccess(data: UserAccessParams): Promise<UserAccess | null> {
    const { granterUserId, targetUserId, centerId } = data;
    return this.userAccessRepository.findUserAccess(
      granterUserId,
      targetUserId,
      centerId,
    );
  }

  async canUserAccess(data: UserAccessParams): Promise<boolean> {
    const { granterUserId, targetUserId, centerId } = data;
    if (granterUserId === targetUserId) {
      return true;
    }
    // check roleType for granterUserId
    const granterUserHighestRole =
      await this.userRoleRepository.getUserRoleWithFallback(
        granterUserId,
        centerId,
      );
    const roleType = granterUserHighestRole?.role?.type;
    if (roleType === RoleType.SUPER_ADMIN) return true;
    else if (roleType === RoleType.CENTER_ADMIN) {
      if (centerId) {
        const canAccessCenter = await this.canCenterAccess({
          userId: granterUserId,
          centerId,
        });
        return canAccessCenter;
      } else return false;
    } else if (roleType === RoleType.ADMIN) {
      if (centerId) {
        const canAccessCenter = await this.canCenterAccess({
          userId: granterUserId,
          centerId,
        });
        return canAccessCenter;
      } else {
        //TODO: access users within accessable centers
        return false;
      }
    } else {
      const userAccess = await this.findUserAccess({
        granterUserId,
        targetUserId,
        centerId,
      });
      return !!userAccess;
    }
  }

  async validateUserAccess(data: UserAccessParams): Promise<void> {
    const userAccess = await this.canUserAccess(data);
    if (!userAccess) {
      throw new ForbiddenException('You do not have access to target user');
    }
  }

  // center access methods

  async canCenterAccess(data: CenterAccessParams): Promise<boolean> {
    const { userId, centerId } = data;
    const userRole = await this.userRoleRepository.getUserRoleWithFallback(
      userId,
      centerId,
    );
    const roleType = userRole?.role?.type;

    // Super admin has access to all centers
    if (roleType === RoleType.SUPER_ADMIN) {
      return true;
    }

    // If user has a role in this center, they have access to it
    // (centerId in userRoles = center access)
    return !!userRole;
  }

  async validateCenterAccess(data: CenterAccessParams): Promise<void> {
    const centerAccess = await this.canCenterAccess(data);
    if (!centerAccess) {
      throw new ForbiddenException('You do not have access to center');
    }
  }
}
