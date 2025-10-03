import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/roles/role.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '../services/access-control-helper.service';
import { RoleResponseDto } from '../dto/role-response.dto';

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    protected readonly logger: LoggerService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(roleRepository, logger);
  }

  async paginateRoles(
    query: PaginationQuery,
    centerId?: string,
    targetUserId?: string,
  ): Promise<Pagination<RoleResponseDto>> {
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
    let filteredItems: RoleResponseDto[] = result.items;

    if (targetUserId) {
      const accessibleRolesIds =
        await this.accessControlHelperService.getAccessibleRolesIdsForUser(
          targetUserId,
          centerId,
        );
      filteredItems = filteredItems.map((role) =>
        Object.assign(role, {
          isRoleAccessible: accessibleRolesIds.includes(role.id),
        }),
      );
    } else {
      filteredItems = filteredItems.map((role) =>
        Object.assign(role, {
          isRoleAccessible: false,
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
