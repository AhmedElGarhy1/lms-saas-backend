import { Injectable } from '@nestjs/common';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { Permission } from '../entities/permission.entity';
import { UserAccess } from '../../user/entities/user-access.entity';
import { UserOnCenter } from '../entities/user-on-center.entity';
import { PermissionRepository } from './permission.repository';
import { UserAccessRepository } from './user-access.repository';
import { UserOnCenterRepository } from './user-on-center.repository';
import { LoggerService } from '../../../shared/services/logger.service';

@Injectable()
export class AccessControlRepository {
  constructor(
    private readonly logger: LoggerService,
    private readonly permissionRepo: PermissionRepository,
    private readonly userAccessRepo: UserAccessRepository,
    private readonly userOnCenterRepo: UserOnCenterRepository,
  ) {}

  // Simple delegation methods - no complex consolidation needed
  async paginatePermissions(options: {
    query: PaginationQuery;
  }): Promise<Pagination<Permission>> {
    return this.permissionRepo.paginatePermissions(options.query);
  }

  async paginateAdminPermissions(options: {
    query: PaginationQuery;
  }): Promise<Pagination<Permission>> {
    return this.permissionRepo.paginateAdminPermissions(options);
  }

  async paginateUserCenters(options: {
    query: PaginationQuery;
    userId: string;
  }): Promise<Pagination<UserOnCenter>> {
    return this.userOnCenterRepo.paginateUserCenters(options);
  }

  // Permission methods - delegate to PermissionRepository
  async createPermission(data: {
    action: string;
    description?: string;
    isAdmin?: boolean;
  }): Promise<Permission> {
    return this.permissionRepo.createPermission(data);
  }

  async findPermissionByAction(action: string): Promise<Permission | null> {
    return this.permissionRepo.findPermissionByAction(action);
  }

  async getAdminPermissions(): Promise<Permission[]> {
    return this.permissionRepo.getAdminPermissions();
  }

  // User Permission methods - delegate to UserPermissionRepository
  async assignUserPermission(data: {
    userId: string;
    permissionId: string;
    centerId?: string;
  }): Promise<void> {
    // This method is no longer needed as permissions are role-based
    // Keeping it for now to avoid breaking existing calls, but it will be removed later
    // return this.userPermissionRepo.assignUserPermission(data);
  }

  async getUserPermissions(userId: string, centerId?: string) {
    // This method is no longer needed as permissions are role-based
    // Keeping it for now to avoid breaking existing calls, but it will be removed later
    // return this.userPermissionRepo.getUserPermissions(userId, centerId);
  }

  async removeUserPermission(data: {
    userId: string;
    permissionId: string;
    centerId?: string;
  }): Promise<void> {
    // This method is no longer needed as permissions are role-based
    // Keeping it for now to avoid breaking existing calls, but it will be removed later
    // return this.userPermissionRepo.removeUserPermission(data);
  }

  // User Access methods - delegate to UserAccessRepository
  async findUserAccess(granterUserId: string, targetUserId: string) {
    return this.userAccessRepo.findUserAccess(granterUserId, targetUserId);
  }

  async grantUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    return this.userAccessRepo.grantUserAccess(body);
  }

  async revokeUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    return this.userAccessRepo.revokeUserAccess(body);
  }

  async listUserAccesses(userId: string): Promise<UserAccess[]> {
    return this.userAccessRepo.listUserAccesses(userId);
  }

  // Center Access methods - delegate to UserOnCenterRepository
  async findCenterAccess(
    userId: string,
    centerId: string,
  ): Promise<UserOnCenter | null> {
    return this.userOnCenterRepo.findCenterAccess(userId, centerId);
  }

  async grantCenterAccess(
    userId: string,
    centerId: string,
  ): Promise<UserOnCenter> {
    return this.userOnCenterRepo.grantCenterAccess(userId, centerId);
  }

  async revokeCenterAccess(userId: string, centerId: string): Promise<void> {
    return this.userOnCenterRepo.revokeCenterAccess(userId, centerId);
  }

  async updateUserCenterActivation(
    userId: string,
    centerId: string,
    isActive: boolean,
  ): Promise<void> {
    return this.userOnCenterRepo.updateUserCenterActivation(
      userId,
      centerId,
      isActive,
    );
  }

  async getUserCenters(userId: string) {
    return this.userOnCenterRepo.getUserCenters(userId);
  }

  async hasCenterAccess(userId: string, centerId: string): Promise<boolean> {
    return this.userOnCenterRepo.hasCenterAccess(userId, centerId);
  }

  async getCenterUsers(centerId: string): Promise<Array<{ userId: string }>> {
    return this.userOnCenterRepo.getCenterUsers(centerId);
  }

  // Permission check methods
  async needsPermissionCheck(
    userId: string,
    centerId?: string,
  ): Promise<boolean> {
    // Check if user has admin roles
    // This method is no longer needed as permissions are role-based
    // Keeping it for now to avoid breaking existing calls, but it will be removed later
    // const userRoles =
    //   await this.userPermissionRepo.findUserPermissionsByUserId(userId);

    // const hasAdminPermission = userRoles.some(
    //   (userRole) => userRole.permission.isAdmin,
    // );

    // if (hasAdminPermission) {
    //   return false; // Admin users don't need permission checks
    // }

    // Check if user has center admin roles
    if (centerId) {
      // This method is no longer needed as permissions are role-based
      // Keeping it for now to avoid breaking existing calls, but it will be removed later
      // const adminRoles = await this.userPermissionRepo.getUserPermissions(
      //   userId,
      //   centerId,
      // );
      // const hasCenterAdminPermission = adminRoles.some(
      //   (userRole) => userRole.permission.isAdmin,
      // );
      // if (hasCenterAdminPermission) {
      //   return false; // Center admin users don't need permission checks
      // }
    }

    return true; // Regular users need permission checks
  }

  async userHasRoleType(userId: string, roleType: string): Promise<boolean> {
    // This method is no longer needed as permissions are role-based
    // Keeping it for now to avoid breaking existing calls, but it will be removed later
    // const userRoles =
    //   await this.userPermissionRepo.findUserPermissionsByUserId(userId);

    // return userRoles.some(
    //   (userRole) => userRole.permission.action === roleType,
    // );
    return false; // No longer applicable
  }

  async checkCenterAccess(userId: string, centerId: string): Promise<boolean> {
    // Check if user has direct center access
    const hasDirectAccess = await this.hasCenterAccess(userId, centerId);
    if (hasDirectAccess) {
      return true;
    }

    return false; // No longer applicable
  }
}
