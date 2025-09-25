import { Injectable } from '@nestjs/common';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { RolesRepository } from '../repositories/roles.repository';
import { Role } from '../entities/roles/role.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async paginateRoles(query: PaginationQuery): Promise<Pagination<Role>> {
    return this.rolesRepository.paginate({
      page: query.page,
      limit: query.limit,
      search: query.search,
      filter: query.filter,
      sortBy: query.sortBy,
      searchableColumns: ['name', 'description'],
      sortableColumns: ['name', 'description', 'createdAt'],
      defaultSortBy: ['name', 'ASC'],
    });
  }

  async getRolesByType(type: RoleType) {
    return this.rolesRepository.getRolesByType(type);
  }

  async createRole(data: {
    name: string;
    type: RoleType;
    description?: string;
    permissions?: string[];
    isActive?: boolean;
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

  async getUserRolesForCenter(userId: string, centerId: string) {
    return this.rolesRepository.getUserRolesForScope(
      userId,
      'CENTER',
      centerId,
    );
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
    return this.rolesRepository.findWithRelations(roleId);
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
      (ur) => ur.role.type === RoleType.CENTER_ADMIN,
    );
    return centerAdminRoles.map((ur) => ur.userId);
  }
}
