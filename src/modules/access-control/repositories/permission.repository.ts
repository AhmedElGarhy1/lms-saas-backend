import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Permission } from '../entities/permission.entity';
import { LoggerService } from '../../../shared/services/logger.service';
import { paginate } from 'nestjs-paginate';

@Injectable()
export class PermissionRepository extends BaseRepository<Permission> {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    protected readonly logger: LoggerService,
  ) {
    super(permissionRepository, logger);
  }

  async createPermission(data: {
    action: string;
    description?: string;
    isAdmin?: boolean;
  }): Promise<Permission> {
    const permission = this.permissionRepository.create({
      action: data.action,
      description: data.description || data.action,
      isAdmin: data.isAdmin || false,
    });
    return this.permissionRepository.save(permission);
  }

  async findPermissionByAction(action: string): Promise<Permission | null> {
    return this.permissionRepository.findOne({ where: { action } });
  }

  async getAdminPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({ where: { isAdmin: true } });
  }

  // Single consolidated pagination method with filter parameter
  async paginatePermissions(
    query: PaginateQuery,
    filter?: 'all' | 'admin-only',
  ): Promise<Paginated<Permission>> {
    const options = {
      searchableColumns: ['action', 'description'],
      sortableColumns: ['action', 'isAdmin', 'createdAt', 'updatedAt'],
      filterableColumns: ['isAdmin'],
      defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
      defaultLimit: 10,
      maxLimit: 100,
    };

    if (filter === 'admin-only') {
      const queryBuilder = this.permissionRepository
        .createQueryBuilder('permission')
        .where('permission.isAdmin = :isAdmin', { isAdmin: true });

      return await paginate(query, queryBuilder, {
        sortableColumns: ['action', 'isAdmin', 'createdAt', 'updatedAt'],
        searchableColumns: ['action', 'description'],
        filterableColumns: {
          isAdmin: true,
        },
        defaultSortBy: [['createdAt', 'DESC']],
        defaultLimit: 10,
        maxLimit: 100,
      });
    }

    return this.paginate(query, options);
  }

  // Convenience method for admin permissions
  async paginateAdminPermissions(options: {
    query: PaginateQuery;
  }): Promise<Paginated<Permission>> {
    return this.paginatePermissions(options.query, 'admin-only');
  }
}
