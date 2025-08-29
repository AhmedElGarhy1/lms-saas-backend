import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserRole } from '../entities/roles/user-role.entity';
import { AdminCenterAccess } from '../entities/admin/admin-center-access.entity';
import { UserOnCenter } from '../entities/user-on-center.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';

@Injectable()
export class AccessControlHelperService {
  constructor(
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(AdminCenterAccess)
    private adminCenterAccessRepository: Repository<AdminCenterAccess>,
    @InjectRepository(UserOnCenter)
    private userOnCenterRepository: Repository<UserOnCenter>,
    @InjectRepository(UserAccess)
    private userAccessRepository: Repository<UserAccess>,
  ) {}

  async getUserCenters(userId: string): Promise<string[]> {
    const userCenters = await this.userOnCenterRepository.find({
      where: { userId },
      select: ['centerId'],
    });
    return userCenters.map((uc) => uc.centerId);
  }

  async getAdminCenters(userId: string): Promise<string[]> {
    const adminCenters = await this.adminCenterAccessRepository.find({
      where: { adminUserId: userId },
      select: ['centerId'],
    });
    return adminCenters.map((aca) => aca.centerId);
  }

  async getUserRoles(userId: string, centerId?: string): Promise<UserRole[]> {
    const where: any = { userId };
    if (centerId) {
      where.centerId = centerId;
    }

    return this.userRoleRepository.find({
      where,
      relations: ['role'],
    });
  }

  async hasCenterAccess(userId: string, centerId: string): Promise<boolean> {
    const userCenter = await this.userOnCenterRepository.findOne({
      where: { userId, centerId },
    });
    return !!userCenter;
  }

  async hasAdminAccess(userId: string, centerId: string): Promise<boolean> {
    const adminAccess = await this.adminCenterAccessRepository.findOne({
      where: { adminUserId: userId, centerId },
    });
    return !!adminAccess;
  }

  async canAccessUser(
    granterUserId: string,
    targetUserId: string,
    centerId?: string,
  ): Promise<boolean> {
    if (granterUserId === targetUserId) {
      return true;
    }

    const userAccess = await this.userAccessRepository.findOne({
      where: {
        granterUserId,
        targetUserId,
        ...(centerId && { centerId }),
      },
    });
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

  async getUserHighestRole(userId: string): Promise<UserRole | null> {
    const userRoles = await this.getUserRoles(userId);
    if (userRoles.length === 0) {
      return null;
    }

    // Return the first role for now - you can implement more sophisticated logic
    return userRoles[0];
  }

  async getAccessibleUsersIdsByIds(
    userId: string,
    targetUserIds: string[],
  ): Promise<string[]> {
    const userAccesses = await this.userAccessRepository.find({
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
