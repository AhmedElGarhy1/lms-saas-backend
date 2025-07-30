import { Injectable } from '@nestjs/common';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { RolesRepository } from '../repositories/roles.repository';
import { Role } from '../entities/roles/role.entity';
import { RoleTypeEnum } from '../constants/role-type.enum';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async paginateRoles(query: PaginateQuery): Promise<Paginated<Role>> {
    return this.rolesRepository.paginate(query, {
      searchableColumns: ['name', 'description'],
      sortableColumns: ['name', 'description', 'createdAt'],
      filterableColumns: ['name', 'description', 'type'],
      defaultSortBy: ['name', 'ASC'],
      defaultLimit: 10,
      maxLimit: 100,
    });
  }

  async getRolesByType(type: RoleTypeEnum) {
    return this.rolesRepository.getRolesByType(type);
  }

  async createRole(data: {
    name: string;
    type: RoleTypeEnum;
    description?: string;
    permissions?: string[];
    isActive?: boolean;
    isAdmin?: boolean;
  }) {
    return this.rolesRepository.createRole(data);
  }

  async updateRole(
    roleId: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
      isActive?: boolean;
    },
  ) {
    return this.rolesRepository.updateRole(roleId, data);
  }

  async deleteRole(roleId: string) {
    return this.rolesRepository.deleteRole(roleId);
  }

  async assignRole(data: {
    userId: string;
    roleId: string;
    scopeType: string;
    centerId?: string;
  }) {
    return this.rolesRepository.assignRole(data);
  }

  async removeUserRole(data: {
    userId: string;
    roleId: string;
    centerId?: string;
  }) {
    return this.rolesRepository.removeUserRole(data);
  }

  async getUserRoles(userId: string) {
    return this.rolesRepository.getUserRoles(userId);
  }

  async getUserRolesForScope(userId: string, scope: string, centerId?: string) {
    return this.rolesRepository.getUserRolesForScope(userId, scope, centerId);
  }

  async getUsersByRoleType(type: string, centerId?: string) {
    return this.rolesRepository.getUsersByRoleType(type, centerId);
  }

  async findUserRolesByType(
    userId: string,
    roleType: string,
    centerId?: string,
  ) {
    return this.rolesRepository.findUserRolesByType(userId, roleType, centerId);
  }

  async findUserRolesByRoleId(roleId: string) {
    return this.rolesRepository.findUserRolesByRoleId(roleId);
  }

  async findById(roleId: string) {
    return this.rolesRepository.findById(roleId);
  }

  async userHasRoleType(userId: string, type: string, centerId?: string) {
    return this.rolesRepository.userHasRoleType(userId, type, centerId);
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    return this.rolesRepository.updateRolePermissions(roleId, permissionIds);
  }

  async getRolePermissions(roleId: string) {
    return this.rolesRepository.getRolePermissions(roleId);
  }

  async findUserRolesByRoleIds(roleIds: string[], centerId?: string) {
    return this.rolesRepository.findUserRolesByRoleIds(roleIds, centerId);
  }

  async getUserCountByRoleId(roleId: string) {
    return this.rolesRepository.getUserCountByRoleId(roleId);
  }

  async findCenterAdmins(centerId: string): Promise<string[]> {
    const userRoles = await this.rolesRepository.getUserRolesForScope(
      '',
      'CENTER',
      centerId,
    );
    const centerAdminRoles = userRoles.filter(
      (ur) => ur.role.type === 'CENTER_ADMIN',
    );
    return centerAdminRoles.map((ur) => ur.userId);
  }
}
