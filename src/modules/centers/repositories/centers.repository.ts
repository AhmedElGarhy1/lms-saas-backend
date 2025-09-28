import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from '../entities/center.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { LoggerService } from '../../../shared/services/logger.service';
import { CENTER_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';

@Injectable()
export class CentersRepository extends BaseRepository<Center> {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
    protected readonly logger: LoggerService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(centerRepository, logger);
  }

  findByName(name: string): Promise<Center | null> {
    return this.centerRepository.findOne({ where: { name } });
  }

  async paginateCenters(
    query: PaginationQuery,
    userId: string,
  ): Promise<Pagination<Center>> {
    const userRole =
      await this.accessControlHelperService.getUserHighestRole(userId);
    const userRoleType = userRole?.role?.type;
    const queryBuilder = this.centerRepository.createQueryBuilder('center');

    // this isn't allowd for user or center admin
    if (
      userRoleType === RoleType.USER ||
      userRoleType === RoleType.CENTER_ADMIN
    ) {
      throw new BadRequestException('Access denied to this user');
    } else if (userRoleType === RoleType.ADMIN) {
      queryBuilder.leftJoin('center.userCenters', 'userCenters');
      queryBuilder.andWhere('userCenters.userId = :userId', {
        userId: userId,
      });
    }

    return this.paginate({
      page: query.page,
      limit: query.limit,
      search: query.search,
      filter: query.filter,
      sortBy: query.sortBy,
      searchableColumns: CENTER_PAGINATION_COLUMNS.searchableColumns,
      sortableColumns: CENTER_PAGINATION_COLUMNS.sortableColumns,
      defaultSortBy: CENTER_PAGINATION_COLUMNS.defaultSortBy,
      defaultLimit: 20,
    });
  }

  async updateCenter(
    centerId: string,
    updateData: Partial<Center>,
  ): Promise<Center | null> {
    await this.centerRepository.update(centerId, updateData);
    return this.findOne(centerId);
  }

  async updateCenterActivation(
    centerId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.centerRepository.update(centerId, { isActive });
  }

  // Seeder method
  async clearAllCenters(): Promise<void> {
    await this.centerRepository.createQueryBuilder().delete().execute();
  }
}
