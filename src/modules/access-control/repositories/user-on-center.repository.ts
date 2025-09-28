import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { UserOnCenter } from '../entities/user-on-center.entity';
import { LoggerService } from '../../../shared/services/logger.service';
import { Center } from '@/modules/centers/entities/center.entity';

@Injectable()
export class UserOnCenterRepository extends BaseRepository<UserOnCenter> {
  constructor(
    @InjectRepository(UserOnCenter)
    private readonly userOnCenterRepository: Repository<UserOnCenter>,
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
  }): Promise<UserOnCenter> {
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

  async getUserCenters(userId: string): Promise<UserOnCenter[]> {
    return this.userOnCenterRepository.find({
      where: { userId },
      relations: ['center'],
    });
  }

  async getCenterUsers(centerId: string): Promise<UserOnCenter[]> {
    return this.userOnCenterRepository.find({
      where: { centerId },
      select: ['userId'],
    });
  }

  async findCenterAccess(
    userId: string,
    centerId: string,
  ): Promise<UserOnCenter | null> {
    return this.userOnCenterRepository.findOne({
      where: { userId, centerId },
    });
  }

  async updateUserCenterActivation(
    userId: string,
    centerId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.userOnCenterRepository.update(
      { userId, centerId },
      { isActive },
    );
  }

  async paginateUserCenters(options: {
    query: PaginationQuery;
    userId: string;
  }): Promise<Pagination<UserOnCenter>> {
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
