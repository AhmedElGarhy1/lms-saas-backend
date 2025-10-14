import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '../services';
import { RoleResponseDto } from '../dto/role-response.dto';
import { PaginateRolesDto } from '../dto/paginate-roles.dto';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { CreateRoleRequestDto } from '../dto/create-role.dto';
import { RolePermissionRepository } from './role-permission.repository';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly rolePermissionRepository: RolePermissionRepository,
    protected readonly logger: LoggerService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(roleRepository, logger);
  }

  async findRolePermissions(roleId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
    if (!role) {
      throw new ResourceNotFoundException('Role was not found');
    }
    return role;
  }

  async createRole(data: CreateRoleRequestDto): Promise<Role> {
    const { permissions, ...roleData } = data;
    const role = await this.create(roleData);
    await this.rolePermissionRepository.bulkInsert(
      permissions.map((permission) => ({
        permissionId: permission.id,
        permissionScope: permission.scope,
        userId: role.createdBy,
        roleId: role.id,
      })),
    );
    return role;
  }

  async updateRole(roleId: string, data: CreateRoleRequestDto): Promise<Role> {
    const { permissions, ...roleData } = data;
    const role = await this.update(roleId, roleData);
    if (!role) {
      throw new ResourceNotFoundException('Role was not found');
    }
    // sync permissions
    const toAdd = permissions.filter(
      (permission) =>
        !role.rolePermissions.some((p) => p.permissionId === permission.id),
    );
    const toRemove = role.rolePermissions.filter(
      (p) =>
        !permissions.some((permission) => permission.id === p.permissionId),
    );
    await this.rolePermissionRepository.bulkInsert(
      toAdd.map((permission) => ({
        permissionId: permission.id,
        permissionScope: permission.scope,
        userId: role.createdBy,
        roleId: role.id,
      })),
    );
    await this.rolePermissionRepository.bulkDelete(
      toRemove.map((permission) => permission.id),
    );

    return role;
  }

  async paginateRoles(
    query: PaginateRolesDto,
    actorId: string,
  ): Promise<Pagination<RoleResponseDto>> {
    const { centerId, userId } = query;
    const queryBuilder = this.roleRepository.createQueryBuilder('role');

    // Apply center filter
    if (centerId) {
      queryBuilder.where('role.centerId = :centerId', { centerId });
    } else {
      queryBuilder
        .where('role.centerId IS NULL')
        .andWhere('role.type != :roleType', { roleType: RoleType.CENTER });
    }
    if (query.type) {
      queryBuilder.where('role.type = :type', { type: query.type });
    }

    const result = await this.paginate(
      query,
      {
        searchableColumns: ['name', 'description'],
        sortableColumns: ['name', 'description', 'createdAt'],
        defaultSortBy: ['name', 'ASC'],
      },
      '/roles',
      queryBuilder,
    );
    let filteredItems: RoleResponseDto[] = result.items;

    if (userId) {
      const accessibleRolesIds =
        await this.accessControlHelperService.getAccessibleRolesIdsForUser(
          userId,
          centerId,
        );
      filteredItems = filteredItems.map((role) =>
        Object.assign(role, {
          isUserAccessible: accessibleRolesIds.includes(role.id),
        }),
      );
    }
    return {
      ...result,
      items: filteredItems,
    };
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({ where: { name } });
  }
}
