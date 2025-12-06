import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Role } from '../entities/role.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Pagination } from '@/shared/common/types/pagination.types';
import { AccessControlHelperService } from '../services/access-control-helper.service';
import { RoleResponseDto } from '../dto/role-response.dto';
import { PaginateRolesDto } from '../dto/paginate-roles.dto';
import { CreateRoleRequestDto } from '../dto/create-role.dto';
import { RolePermissionRepository } from './role-permission.repository';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { In } from 'typeorm';
import { RolePermission } from '../entities/role-permission.entity';

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly rolePermissionRepository: RolePermissionRepository,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
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
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.role',
        identifier: 'ID',
        value: roleId,
      });
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
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.role',
        identifier: 'ID',
        value: roleId,
      });
    }
    const existingRolePermissions =
      await this.rolePermissionRepository.findMany({
        where: { roleId },
      });
    // sync permissions
    // TODO: sync permission scope also
    const toAdd = rolePermissions.filter(
      (p) => !existingRolePermissions.some((erp) => erp.permissionId === p.id),
    );
    const toRemove = existingRolePermissions.filter(
      (erp) => !rolePermissions.some((p) => p.id === erp.permissionId),
    );

    const toUpdate: RolePermission[] = existingRolePermissions
      .map((erp) => {
        const exists = rolePermissions.find((p) => p.id === erp.permissionId);
        if (exists && exists.scope !== erp.permissionScope) {
          return {
            ...erp,
            permissionScope: exists.scope,
          };
        }
        return undefined;
      })
      .filter((rp) => rp !== undefined);

    if (toAdd.length > 0) {
      await this.rolePermissionRepository.bulkInsert(
        toAdd.map((rp) => ({
          permissionId: rp.id,
          permissionScope: rp.scope,
          userId: role.createdBy,
          roleId: role.id,
        })),
      );

      // Note: Detailed permission change logging should be handled by event listeners
      // The RoleEvents.UPDATED event will be emitted by the service after this method returns
    }
    if (toRemove.length > 0) {
      await this.rolePermissionRepository.bulkDelete({
        id: In(toRemove.map((rp) => rp.id)),
      });

      // Note: Detailed permission change logging should be handled by event listeners
      // The RoleEvents.UPDATED event will be emitted by the service after this method returns
    }
    if (toUpdate.length > 0) {
      await this.rolePermissionRepository.updateMany(
        toUpdate.map((rp) => ({
          id: rp.id,
          data: {
            permissionScope: rp.permissionScope,
          },
        })),
      );

      // Note: Detailed permission change logging should be handled by event listeners
      // The RoleEvents.UPDATED event will be emitted by the service after this method returns
    }

    return role;
  }

  async paginateRoles(
    query: PaginateRolesDto,
  ): Promise<Pagination<RoleResponseDto>> {
    const { centerId, userProfileId } = query;
    const queryBuilder = this.getRepository().createQueryBuilder('role');

    // Apply center filter
    if (centerId) {
      queryBuilder.where('role.centerId = :centerId', { centerId });
    } else {
      queryBuilder.where('role.centerId IS NULL');
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
