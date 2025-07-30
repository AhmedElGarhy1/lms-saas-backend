import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { UserOnCenter } from '../entities/user-on-center.entity';
import { LoggerService } from '../../../shared/services/logger.service';
import { paginate } from 'nestjs-paginate';

@Injectable()
export class UserOnCenterRepository extends BaseRepository<UserOnCenter> {
  constructor(
    @InjectRepository(UserOnCenter)
    private readonly userOnCenterRepository: Repository<UserOnCenter>,
    protected readonly logger: LoggerService,
  ) {
    super(userOnCenterRepository, logger);
  }

  async grantCenterAccess(
    userId: string,
    centerId: string,
  ): Promise<UserOnCenter> {
    const userOnCenter = this.userOnCenterRepository.create({
      userId,
      centerId,
    });

    return this.userOnCenterRepository.save(userOnCenter);
  }

  async revokeCenterAccess(userId: string, centerId: string): Promise<void> {
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

  async getCenterUsers(centerId: string): Promise<Array<{ userId: string }>> {
    const userOnCenters = await this.userOnCenterRepository.find({
      where: { centerId },
      select: ['userId'],
    });

    return userOnCenters.map((uoc) => ({ userId: uoc.userId }));
  }

  async hasCenterAccess(userId: string, centerId: string): Promise<boolean> {
    const userOnCenter = await this.userOnCenterRepository.findOne({
      where: { userId, centerId },
    });

    return !!userOnCenter;
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
    query: PaginateQuery;
    userId: string;
  }): Promise<Paginated<UserOnCenter>> {
    const { query, userId } = options;

    const queryBuilder = this.userOnCenterRepository
      .createQueryBuilder('userOnCenter')
      .leftJoinAndSelect('userOnCenter.center', 'center')
      .where('userOnCenter.userId = :userId', { userId });

    return await paginate(query, queryBuilder, {
      sortableColumns: ['createdAt', 'updatedAt'],
      searchableColumns: ['center.name', 'center.description'],
      filterableColumns: {
        'center.isActive': true,
      },
      defaultSortBy: [['createdAt', 'DESC']],
      defaultLimit: 10,
      maxLimit: 100,
    });
  }
}
