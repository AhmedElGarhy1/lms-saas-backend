import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Role } from '../entities/roles/role.entity';
import { UserRole } from '../entities/roles/user-role.entity';
import { User } from '../../user/entities/user.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '../services/access-control-helper.service';

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    protected readonly logger: LoggerService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(roleRepository, logger);
  }

  async paginateRoles(
    query: PaginationQuery,
    centerId?: string,
    targetUserId?: string,
  ): Promise<Pagination<Role>> {
    const queryBuilder = this.roleRepository.createQueryBuilder('role');
    if (centerId) {
      queryBuilder.where('role.centerId = :centerId', { centerId });
    } else {
      queryBuilder.where('role.centerId IS NULL');
    }

    const result = await this.paginate(
      {
        page: query.page,
        limit: query.limit,
        search: query.search,
        filter: query.filter,
        sortBy: query.sortBy,
        searchableColumns: ['name', 'description'],
        sortableColumns: ['name', 'description', 'createdAt'],
        defaultSortBy: ['name', 'ASC'],
      },
      queryBuilder,
    );
    let filteredItems = result.items;

    if (targetUserId) {
      const accessibleRolesIds =
        await this.accessControlHelperService.getAccessibleRolesIdsForUser(
          targetUserId,
          centerId,
        );
      filteredItems = filteredItems.map((role) => ({
        ...role,
        isRoleAccessible: accessibleRolesIds.includes(role.id),
      }));
    }
    return {
      ...result,
      items: filteredItems,
    };
  }

  // Role management methods
  async createRole(data: {
    name: string;
    type: RoleType;
    description?: string;
    permissions?: string[];
    isActive?: boolean;
  }): Promise<Role> {
    const role = this.roleRepository.create(data);
    return await this.roleRepository.save(role);
  }

  async findRoleById(roleId: string): Promise<Role | null> {
    return await this.roleRepository.findOne({ where: { id: roleId } });
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({ where: { name } });
  }

  async updateRole(
    roleId: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
      isActive?: boolean;
    },
  ): Promise<Role | null> {
    await this.roleRepository.update(roleId, data);
    return await this.findRoleById(roleId);
  }

  async deleteRole(roleId: string): Promise<void> {
    await this.roleRepository.delete(roleId);
  }

  async getRolesByType(type: RoleType): Promise<Role[]> {
    return await this.roleRepository.find({ where: { type } });
  }

  // User-Role assignment methods
  async assignRole(data: {
    userId: string;
    roleId: string;
    centerId?: string;
  }): Promise<UserRole> {
    const userRole = this.userRoleRepository.create(data);
    return await this.userRoleRepository.save(userRole);
  }

  async removeUserRole(data: {
    userId: string;
    roleId: string;
    centerId?: string;
  }): Promise<void> {
    const where: FindOptionsWhere<UserRole> = {
      userId: data.userId,
      roleId: data.roleId,
    };

    if (data.centerId) {
      where.centerId = data.centerId;
    }

    await this.userRoleRepository.delete(where);
  }

  async getUserRoles(userId: string, centerId?: string): Promise<UserRole[]> {
    return await this.userRoleRepository.find({
      where: { userId, centerId },
      relations: ['role', 'user'],
    });
  }

  async getUsersByRoleType(type: string, centerId?: string): Promise<User[]> {
    const queryBuilder = this.userRoleRepository
      .createQueryBuilder('userRole')
      .leftJoinAndSelect('userRole.user', 'user')
      .leftJoinAndSelect('userRole.role', 'role')
      .where('role.type = :type', { type });

    if (centerId) {
      queryBuilder.andWhere('userRole.centerId = :centerId', { centerId });
    }

    const userRoles = await queryBuilder.getMany();
    return userRoles.map((userRole) => userRole.user);
  }

  async findUserRolesByType(
    userId: string,
    roleType: string,
    centerId?: string,
  ): Promise<UserRole[]> {
    const queryBuilder = this.userRoleRepository
      .createQueryBuilder('userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .where('userRole.userId = :userId', { userId })
      .andWhere('role.type = :roleType', { roleType });

    if (centerId) {
      queryBuilder.andWhere('userRole.centerId = :centerId', { centerId });
    }

    return await queryBuilder.getMany();
  }

  async findUserRolesByRoleId(roleId: string): Promise<UserRole[]> {
    return await this.userRoleRepository.find({
      where: { roleId },
      relations: ['user', 'role'],
    });
  }

  async findWithRelations(roleId: string): Promise<Role | null> {
    return await this.roleRepository.findOne({ where: { id: roleId } });
  }

  async userHasRoleType(
    userId: string,
    type: string,
    centerId?: string,
  ): Promise<boolean> {
    const queryBuilder = this.userRoleRepository
      .createQueryBuilder('userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .where('userRole.userId = :userId', { userId })
      .andWhere('role.type = :type', { type });

    if (centerId) {
      queryBuilder.andWhere('userRole.centerId = :centerId', { centerId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    // Implementation depends on your permission system
    this.logger.debug(`Updating permissions for role ${roleId}`, undefined, {
      permissionIds,
    });
  }

  async getRolePermissions(roleId: string): Promise<any[]> {
    // Implementation depends on your permission system
    return [];
  }

  async findUserRolesByRoleIds(
    roleIds: string[],
    centerId?: string,
  ): Promise<UserRole[]> {
    const queryBuilder = this.userRoleRepository
      .createQueryBuilder('userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .leftJoinAndSelect('userRole.user', 'user')
      .where('userRole.roleId IN (:...roleIds)', { roleIds });

    if (centerId) {
      queryBuilder.andWhere('userRole.centerId = :centerId', { centerId });
    }

    return await queryBuilder.getMany();
  }

  async getUserCountByRoleId(roleId: string): Promise<number> {
    return await this.userRoleRepository.count({
      where: { roleId },
    });
  }
}
