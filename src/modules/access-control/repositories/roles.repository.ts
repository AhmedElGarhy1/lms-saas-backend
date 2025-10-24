import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '../services/access-control-helper.service';
import { RoleResponseDto } from '../dto/role-response.dto';
import { PaginateRolesDto } from '../dto/paginate-roles.dto';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { CreateRoleRequestDto } from '../dto/create-role.dto';
import { RolePermissionRepository } from './role-permission.repository';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor(
    private readonly rolePermissionRepository: RolePermissionRepository,
    protected readonly logger: LoggerService,
    private readonly accessControlHelperService: AccessControlHelperService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof Role {
    return Role;
  }

  async findRolePermissions(roleId: string): Promise<Role> {
    const role = await this.getRepository().findOne({
      where: { id: roleId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
    if (!role) {
      throw new ResourceNotFoundException('Role was not found');
    }
    return role;
  }

  async createRole(data: CreateRoleRequestDto): Promise<Role> {
    const { rolePermissions, ...roleData } = data;
    const role = await this.create(roleData);
    await this.rolePermissionRepository.bulkInsert(
      rolePermissions.map((permission) => ({
        permissionId: permission.id,
        permissionScope: permission.scope,
        userId: role.createdBy,
        roleId: role.id,
      })),
    );
    return role;
  }

  async updateRole(roleId: string, data: CreateRoleRequestDto): Promise<Role> {
    const { rolePermissions, ...roleData } = data;
    const role = await this.update(roleId, roleData);
    if (!role) {
      throw new ResourceNotFoundException('Role was not found');
    }
    // sync permissions
    // TODO: sync permission scope also
    const toAdd = rolePermissions.filter(
      (permission) =>
        !role.rolePermissions.some((p) => p.permissionId === permission.id),
    );
    const toRemove = role.rolePermissions.filter(
      (p) =>
        !rolePermissions.some((permission) => permission.id === p.permissionId),
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
    actor: ActorUser,
  ): Promise<Pagination<RoleResponseDto>> {
    const { centerId, userProfileId } = query;
    const queryBuilder = this.getRepository().createQueryBuilder('role');

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

    if (userProfileId) {
      const accessibleRolesIds =
        await this.accessControlHelperService.getAccessibleRolesIdsForProfile(
          userProfileId,
          centerId,
        );
      filteredItems = filteredItems.map((role) =>
        Object.assign(role, {
          isProfileAccessible: accessibleRolesIds.includes(role.id),
        }),
      );
    }
    return {
      ...result,
      items: filteredItems,
    };
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return await this.getRepository().findOne({ where: { name } });
  }
}
