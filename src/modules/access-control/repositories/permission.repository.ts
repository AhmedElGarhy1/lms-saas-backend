import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Permission } from '../entities/permission.entity';
import { LoggerService } from '../../../shared/services/logger.service';
import { PERMISSION_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { PaginationUtils } from '@/shared/common/utils/pagination.utils';

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
    query: PaginationQuery,
    filter?: 'all' | 'admin-only',
  ): Promise<Pagination<Permission>> {
    if (filter === 'admin-only') {
      return this.paginate({
        page: query.page,
        limit: query.limit,
        search: query.search,
        filter: { ...query.filter, isAdmin: true },
        sortBy: query.sortBy,
        searchableColumns: ['action', 'description'],
        sortableColumns: ['createdAt', 'updatedAt', 'action', 'description'],
        defaultSortBy: ['createdAt', 'DESC'],
      });
    }

    return this.paginate({
      page: query.page,
      limit: query.limit,
      search: query.search,
      filter: query.filter,
      sortBy: query.sortBy,
      searchableColumns: PERMISSION_PAGINATION_COLUMNS.searchableColumns,
      sortableColumns: PERMISSION_PAGINATION_COLUMNS.sortableColumns,
      defaultSortBy: PERMISSION_PAGINATION_COLUMNS.defaultSortBy,
    });
  }

  // Convenience method for admin permissions
  async paginateAdminPermissions(options: {
    query: PaginationQuery;
  }): Promise<Pagination<Permission>> {
    return this.paginatePermissions(options.query, 'admin-only');
  }
}
