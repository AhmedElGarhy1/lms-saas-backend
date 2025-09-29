import { ForbiddenException, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { UserRole } from '../entities/roles/user-role.entity';
import { UserOnCenter } from '../entities/user-on-center.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { UserOnCenterRepository } from '../repositories/user-on-center.repository';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { UserAccessParams } from '../interfaces/user-access.params';
import { CenterAccessParams } from '../interfaces/center-access.params';

@Injectable()
export class AccessControlHelperService {
  constructor(
    private userRoleRepository: UserRoleRepository,
    private userOnCenterRepository: UserOnCenterRepository,
    private userAccessRepository: UserAccessRepository,
  ) {}

  async userHasRoleType(userId: string, roleType: string, centerId?: string) {
    return this.userRoleRepository.userHasRoleType(userId, roleType, centerId);
  }

  async getUserCenters(userId: string) {
    return this.userOnCenterRepository.getUserCenters(userId);
  }

  /**
   * Get user roles for a user, global roles and center roles
   * @param userId - The user id
   * @param centerId - The center id
   * @returns The user roles
   */
  async getUserRoles(userId: string, centerId?: string): Promise<UserRole[]> {
    return this.userRoleRepository.getUserRoles(userId, centerId);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.getUserRoles(userId);
    const permissions = new Set<string>();

    for (const userRole of userRoles) {
      if (userRole.role?.permissions) {
        userRole.role.permissions.forEach((permission: string) => {
          permissions.add(permission);
        });
      }
    }

    return Array.from(permissions);
  }

  async getUserHighestRole(
    userId: string,
    centerId?: string,
  ): Promise<UserRole | null> {
    const userRoles = await this.getUserRoles(userId, centerId);
    //  superadmin -> centerAdmin -> admin -> user
    const superAdminRole = userRoles.find(
      (role) => role.role?.type === RoleType.SUPER_ADMIN,
    );
    // if superadmin he is the highest role
    if (superAdminRole) {
      return superAdminRole;
    }
    // if centerAdmin he is the highest role within the center
    const centerAdminRoles = userRoles.filter(
      (role) => role.role?.type === RoleType.CENTER_ADMIN,
    );
    if (centerId) {
      for (const centerAdminRole of centerAdminRoles) {
        if (centerAdminRole.centerId === centerId) {
          return centerAdminRole;
        }
      }
    }
    const adminRole = userRoles.find(
      (role) => role.role?.type === RoleType.ADMIN,
    );
    if (adminRole) {
      return adminRole;
    }
    const userRole = userRoles.find(
      (role) => role.role?.type === RoleType.USER,
    );
    if (userRole) {
      return userRole;
    }
    return null;
  }

  async getAccessibleUsersIdsForUser(
    userId: string,
    targetUserIds: string[],
    centerId?: string,
  ): Promise<string[]> {
    const userRole = await this.getUserHighestRole(userId, centerId);
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
    const granterUserHighestRole = await this.getUserHighestRole(
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
      } else return false;
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

  async findCenterAccess(
    data: CenterAccessParams,
  ): Promise<UserOnCenter | null> {
    const { userId, centerId } = data;
    return this.userOnCenterRepository.findCenterAccess(userId, centerId);
  }

  async canCenterAccess(data: CenterAccessParams): Promise<boolean> {
    const { userId, centerId } = data;
    const userRole = await this.getUserHighestRole(userId, centerId);
    const roleType = userRole?.role?.type;
    if (roleType === RoleType.SUPER_ADMIN) {
      return true;
    }
    const centerAccess = await this.findCenterAccess(data);
    return !!centerAccess;
  }

  async validateCenterAccess(data: CenterAccessParams): Promise<void> {
    const centerAccess = await this.canCenterAccess(data);
    if (!centerAccess) {
      throw new ForbiddenException('You do not have access to center');
    }
  }
}
