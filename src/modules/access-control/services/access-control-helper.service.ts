import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { UserRole } from '../entities/roles/user-role.entity';
import { UserOnCenter } from '../entities/user-on-center.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { UserOnCenterRepository } from '../repositories/user-on-center.repository';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { UserAccessRepository } from '../repositories/user-access.repository';

@Injectable()
export class AccessControlHelperService {
  constructor(
    private userRoleRepository: UserRoleRepository,
    private userOnCenterRepository: UserOnCenterRepository,
    private userAccessRepository: UserAccessRepository,
  ) {}

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

  async hasCenterAccess(userId: string, centerId: string): Promise<boolean> {
    return this.userOnCenterRepository.hasCenterAccess(userId, centerId);
  }

  async canAccessUser(
    granterUserId: string,
    targetUserId: string,
    centerId?: string,
  ): Promise<boolean> {
    if (granterUserId === targetUserId) {
      return true;
    }

    // check roleType for granterUserId
    const granterUserHighestRole = await this.getUserHighestRole(
      granterUserId,
      centerId,
    );
    const granterUserRoleType = granterUserHighestRole?.role?.type;
    if (
      granterUserRoleType === RoleType.SUPER_ADMIN ||
      granterUserRoleType === RoleType.CENTER_ADMIN
    ) {
      return true;
    }

    // if admin and have access to center so he have access to users
    if (granterUserRoleType === RoleType.ADMIN) {
      if (centerId) {
        const adminHasCenterAccess = await this.hasCenterAccess(
          granterUserId,
          centerId,
        );
        return adminHasCenterAccess;
      }
    }

    const userAccess = await this.userAccessRepository.findUserAccess(
      granterUserId,
      targetUserId,
      centerId,
    );

    return !!userAccess;
  }

  async canAccessCenter(userId: string, centerId: string): Promise<boolean> {
    return this.hasCenterAccess(userId, centerId);
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
    if (superAdminRole) {
      return superAdminRole;
    }
    const centerAdminRole = userRoles.find(
      (role) => role.role?.type === RoleType.CENTER_ADMIN,
    );
    if (centerAdminRole) {
      return centerAdminRole;
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

  async getAccessibleUsersIdsByIds(
    userId: string,
    targetUserIds: string[],
  ): Promise<string[]> {
    const userAccesses = await this.userAccessRepository.findMany({
      where: {
        granterUserId: userId,
        targetUserId: In(targetUserIds),
      },
      select: ['targetUserId'],
    });
    return userAccesses.map((access) => access.targetUserId);
  }

  async validateUserAccess(
    currentUserId: string,
    targetUserId: string,
    centerId?: string,
  ): Promise<boolean> {
    return this.canAccessUser(currentUserId, targetUserId, centerId);
  }

  async validateCenterAccess(
    userId: string,
    centerId: string,
  ): Promise<boolean> {
    return this.hasCenterAccess(userId, centerId);
  }
}
