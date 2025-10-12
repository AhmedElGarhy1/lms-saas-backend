import { Inject, Injectable } from '@nestjs/common';
import { InsufficientPermissionsException } from '@/shared/common/exceptions/custom.exceptions';
import { In } from 'typeorm';
import { UserRole } from '../entities/roles/user-role.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { UserAccessParams } from '../interfaces/user-access.params';
import { CenterAccessParams } from '../interfaces/center-access.params';
import { Role } from '../entities/roles/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { CenterAccessRepository } from '../repositories/center-access.repository';

@Injectable()
export class AccessControlHelperService {
  constructor(
    @Inject(UserRoleRepository)
    private userRoleRepository: UserRoleRepository,
    private userAccessRepository: UserAccessRepository,
    private centerAccessRepository: CenterAccessRepository,
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
    if (centerId) {
      await this.validateCenterAccess({
        userId,
        centerId,
      });
      return;
    } else {
      await this.validateAdminAccess({ userId });
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
    throw new InsufficientPermissionsException(
      'You do not have access to admin',
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
    // TODO: optimize this method later
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

  // TODO: try to optimize this method
  async getAccessibleUsersIdsForCenter(
    centerId: string,
    targetUserIds: string[],
    global: boolean,
  ): Promise<string[]> {
    return Promise.all(
      targetUserIds.map(async (targetUserId) => {
        const canAccess = await this.canCenterAccess({
          userId: targetUserId,
          centerId,
          global,
        });
        return canAccess ? targetUserId : null;
      }),
    ).then((results) => results.filter((result) => result !== null));
  }

  // TODO: check if it works as expected later
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
    const bypassUserAccess = await this.bypassUserAccess(
      granterUserId,
      centerId,
    );
    if (bypassUserAccess) {
      return true;
    }
    const userAccess = await this.findUserAccess({
      granterUserId,
      targetUserId,
      centerId,
    });
    return !!userAccess;
  }

  async validateUserAccess(data: UserAccessParams): Promise<void> {
    const userAccess = await this.canUserAccess(data);
    if (!userAccess) {
      throw new InsufficientPermissionsException(
        'You do not have access to target user',
      );
    }
  }

  // center access methods

  async canCenterAccess(data: CenterAccessParams): Promise<boolean> {
    const { userId, centerId, global } = data;
    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return true;
    }

    const centerAccess = await this.centerAccessRepository.findCenterAccess(
      userId,
      centerId,
      global,
    );
    return !!centerAccess;
  }

  async validateCenterAccess(data: CenterAccessParams): Promise<void> {
    const centerAccess = await this.canCenterAccess(data);
    if (!centerAccess) {
      throw new InsufficientPermissionsException(
        'You do not have access to center',
      );
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

  async bypassUserAccess(userId: string, centerId?: string): Promise<boolean> {
    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return true;
    }
    if (centerId) {
      const isCenterOwner = await this.isCenterOwner(userId, centerId);
      if (isCenterOwner) {
        return true;
      }
      const centerAccess = await this.centerAccessRepository.findCenterAccess(
        userId,
        centerId,
        true,
      );
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
