import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { UserCenter } from '../entities/user-center.entity';
import { LoggerService } from '../../../shared/services/logger.service';

@Injectable()
export class UserOnCenterRepository extends BaseRepository<UserCenter> {
  constructor(
    @InjectRepository(UserCenter)
    private readonly userOnCenterRepository: Repository<UserCenter>,
    protected readonly logger: LoggerService,
  ) {
    super(userOnCenterRepository, logger);
  }

  async grantCenterAccess({
    userId,
    centerId,
    grantedBy,
  }: {
    userId: string;
    centerId: string;
    grantedBy: string;
  }): Promise<UserCenter> {
    const userOnCenter = this.userOnCenterRepository.create({
      userId,
      centerId,
      createdBy: grantedBy,
    });

    return this.userOnCenterRepository.save(userOnCenter);
  }

  async revokeCenterAccess({
    userId,
    centerId,
  }: {
    userId: string;
    centerId: string;
  }): Promise<void> {
    await this.userOnCenterRepository.delete({
      userId,
      centerId,
    });
  }

  async getUserCenters(userId: string): Promise<UserCenter[]> {
    return this.userOnCenterRepository.find({
      where: { userId },
      relations: ['center'],
    });
  }

  async getCenterUsers(centerId: string): Promise<UserCenter[]> {
    return this.userOnCenterRepository.find({
      where: { centerId },
      select: ['userId'],
    });
  }

  async findCenterAccess(
    userId: string,
    centerId: string,
  ): Promise<UserCenter | null> {
    return this.userOnCenterRepository.findOne({
      where: { userId, centerId },
    });
  }

  async paginateUserCenters(options: {
    query: PaginationQuery;
    userId: string;
  }): Promise<Pagination<UserCenter>> {
    const { query, userId } = options;

    const queryBuilder = this.userOnCenterRepository
      .createQueryBuilder('userOnCenter')
      .leftJoinAndSelect('userOnCenter.center', 'center');

    return this.paginate(
      {
        page: query.page,
        limit: query.limit,
        search: query.search,
        filter: { ...query.filter, userId },
        sortBy: query.sortBy,
        searchableColumns: ['center.name', 'center.description'],
        sortableColumns: ['createdAt', 'updatedAt'],
        defaultSortBy: ['createdAt', 'DESC'],
        route: '/user-centers',
      },
      queryBuilder,
    );
  }
}
