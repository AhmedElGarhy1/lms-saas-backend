import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Pagination } from 'nestjs-typeorm-paginate';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Permission } from '../entities/permission.entity';
import { LoggerService } from '../../../shared/services/logger.service';
import { PERMISSION_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { PaginatePermissionsDto } from '../dto/paginate-permissions.dto';

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

  // Single consolidated pagination method
  async paginatePermissions(
    query: PaginatePermissionsDto,
  ): Promise<Pagination<Permission>> {
    const queryBuilder =
      this.permissionRepository.createQueryBuilder('permission');

    // Apply custom filters
    if (query.isAdmin !== undefined) {
      queryBuilder.andWhere('permission.isAdmin = :isAdmin', {
        isAdmin: query.isAdmin,
      });
    }

    return this.paginate(
      query,
      PERMISSION_PAGINATION_COLUMNS,
      '/permissions',
      queryBuilder,
    );
  }

  // Convenience method for admin permissions
  async paginateAdminPermissions(
    query: PaginatePermissionsDto,
  ): Promise<Pagination<Permission>> {
    const adminQuery = { ...query, isAdmin: true };
    return this.paginatePermissions(adminQuery);
  }
}
