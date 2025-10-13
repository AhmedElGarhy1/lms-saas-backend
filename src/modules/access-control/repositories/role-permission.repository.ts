import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RolePermission } from '../entities/role-permission.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { ScopeType } from '@/shared/common/decorators/scope.decorator';

@Injectable()
export class RolePermissionRepository extends BaseRepository<RolePermission> {
  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    protected readonly logger: LoggerService,
  ) {
    super(rolePermissionRepository, logger);
  }

  /**
   * Get all permissions for a specific user
   */
  async getUserPermissions(userId: string): Promise<RolePermission[]> {
    return this.rolePermissionRepository.find({
      where: { userId },
      relations: ['permission', 'role'],
    });
  }

  /**
   * Get all permissions for a specific role
   */
  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    return this.rolePermissionRepository.find({
      where: { roleId },
      relations: ['permission', 'user'],
    });
  }

  /**
   * Get permissions for a user with specific scope
   */
  async getUserPermissionsByScope(
    userId: string,
    scope: ScopeType,
  ): Promise<RolePermission[]> {
    return this.rolePermissionRepository.find({
      where: { userId, permissionScope: scope },
      relations: ['permission', 'role'],
    });
  }

  /**
   * Check if user has specific permission with scope
   */
  async hasPermission(
    userId: string,
    permissionId: string,
    scope: ScopeType,
  ): Promise<boolean> {
    const count = await this.rolePermissionRepository.count({
      where: { userId, permissionId, permissionScope: scope },
    });
    return count > 0;
  }

  /**
   * Get all users with specific permission and scope
   */
  async getUsersWithPermission(
    permissionId: string,
    scope: ScopeType,
  ): Promise<RolePermission[]> {
    return this.rolePermissionRepository.find({
      where: { permissionId, permissionScope: scope },
      relations: ['user', 'role'],
    });
  }

  /**
   * Assign permission to user for specific role and scope
   */
  async assignPermission(
    userId: string,
    roleId: string,
    permissionId: string,
    scope: ScopeType,
  ): Promise<RolePermission> {
    // Check if permission already exists
    const existing = await this.rolePermissionRepository.findOne({
      where: { userId, roleId, permissionId },
    });

    if (existing) {
      // Update existing permission scope
      existing.permissionScope = scope;
      return this.rolePermissionRepository.save(existing);
    }

    // Create new permission assignment
    const rolePermission = this.rolePermissionRepository.create({
      userId,
      roleId,
      permissionId,
      permissionScope: scope,
    });

    return this.rolePermissionRepository.save(rolePermission);
  }

  /**
   * Remove permission from user for specific role
   */
  async removePermission(
    userId: string,
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.rolePermissionRepository.delete({
      userId,
      roleId,
      permissionId,
    });
  }

  /**
   * Remove all permissions for a user
   */
  async removeAllUserPermissions(userId: string): Promise<void> {
    await this.rolePermissionRepository.delete({ userId });
  }

  /**
   * Remove all permissions for a role
   */
  async removeAllRolePermissions(roleId: string): Promise<void> {
    await this.rolePermissionRepository.delete({ roleId });
  }

  /**
   * Get permission assignments by user and role
   */
  async getPermissionsByUserAndRole(
    userId: string,
    roleId: string,
  ): Promise<RolePermission[]> {
    return this.rolePermissionRepository.find({
      where: { userId, roleId },
      relations: ['permission'],
    });
  }
}
