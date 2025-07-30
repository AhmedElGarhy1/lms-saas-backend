import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, IsNull } from 'typeorm';
import { Center, CenterStatus } from '../entities/center.entity';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PaginateQuery } from 'nestjs-paginate';
import { Paginated } from 'nestjs-paginate';
import { LoggerService } from '../../../shared/services/logger.service';

@Injectable()
export class CentersRepository extends BaseRepository<Center> {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
    private readonly dataSource: DataSource,
    protected readonly logger: LoggerService,
  ) {
    super(centerRepository, logger);
  }

  async paginateCenters(query: PaginateQuery): Promise<Paginated<Center>> {
    return this.paginate(query, {
      searchableColumns: ['name', 'description', 'city', 'state', 'country'],
      sortableColumns: [
        'name',
        'status',
        'currentEnrollment',
        'createdAt',
        'updatedAt',
      ],
      filterableColumns: ['status'],
      defaultSortBy: ['createdAt', 'DESC'] as [keyof Center, 'ASC' | 'DESC'],
      defaultLimit: 20,
      maxLimit: 100,
    });
  }

  async findCenterById(centerId: string): Promise<Center | null> {
    return this.centerRepository.findOne({
      where: { id: centerId },
      relations: ['creator', 'userCenters', 'userCenters.user'],
    });
  }

  async findCenterByName(name: string): Promise<Center | null> {
    return this.centerRepository.findOne({
      where: { name },
    });
  }

  async findCentersByStatus(status: CenterStatus): Promise<Center[]> {
    return this.centerRepository.find({
      where: { status },
      order: { name: 'ASC' },
    });
  }

  async findCentersByCreator(createdBy: string): Promise<Center[]> {
    return this.centerRepository.find({
      where: { createdBy },
      order: { createdAt: 'DESC' },
    });
  }

  async findCentersByLocation(
    city?: string,
    state?: string,
    country?: string,
  ): Promise<Center[]> {
    const queryBuilder = this.centerRepository.createQueryBuilder('center');

    if (city) {
      queryBuilder.andWhere('center.city ILIKE :city', { city: `%${city}%` });
    }

    if (state) {
      queryBuilder.andWhere('center.state ILIKE :state', {
        state: `%${state}%`,
      });
    }

    if (country) {
      queryBuilder.andWhere('center.country ILIKE :country', {
        country: `%${country}%`,
      });
    }

    return queryBuilder.orderBy('center.name', 'ASC').getMany();
  }

  async findCentersWithAvailableSpots(): Promise<Center[]> {
    return this.centerRepository
      .createQueryBuilder('center')
      .where('center.status = :status', { status: CenterStatus.ACTIVE })
      .orderBy('center.name', 'ASC')
      .getMany();
  }

  async findCentersWithUsers(centerId: string): Promise<Center | null> {
    return this.centerRepository.findOne({
      where: { id: centerId },
      relations: ['userCenters', 'userCenters.user'],
    });
  }

  async getCenterEnrollmentStats(): Promise<{
    totalCenters: number;
    totalEnrollment: number;
    averageEnrollment: number;
    centersByStatus: Record<string, number>;
  }> {
    const stats = (await this.centerRepository
      .createQueryBuilder('center')
      .select([
        'COUNT(*) as totalCenters',
        'SUM(center.currentEnrollment) as totalEnrollment',
        'AVG(center.currentEnrollment) as averageEnrollment',
      ])
      .getRawOne()) as {
      totalCenters: string;
      totalEnrollment: string;
      averageEnrollment: string;
    };

    const centersByStatus = (await this.centerRepository
      .createQueryBuilder('center')
      .select('center.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('center.status')
      .getRawMany()) as Array<{ status: string; count: string }>;

    return {
      totalCenters: parseInt(stats.totalCenters) || 0,
      totalEnrollment: parseInt(stats.totalEnrollment) || 0,
      averageEnrollment: parseFloat(stats.averageEnrollment) || 0,
      centersByStatus: centersByStatus.reduce(
        (acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  async getTopCentersByEnrollment(limit: number = 10): Promise<Center[]> {
    return this.centerRepository
      .createQueryBuilder('center')
      .orderBy('center.currentEnrollment', 'DESC')
      .limit(limit)
      .getMany();
  }

  async findDeletedCenters(): Promise<Center[]> {
    return this.centerRepository.find({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
    });
  }

  async updateCenter(
    centerId: string,
    updateData: Partial<Center>,
  ): Promise<Center | null> {
    await this.centerRepository.update(centerId, updateData);
    return this.findCenterById(centerId);
  }

  async incrementEnrollment(
    centerId: string,
    increment: number = 1,
  ): Promise<void> {
    await this.centerRepository
      .createQueryBuilder()
      .update(Center)
      .set({ currentEnrollment: () => `currentEnrollment + ${increment}` })
      .where('id = :centerId', { centerId })
      .execute();
  }

  async decrementEnrollment(
    centerId: string,
    decrement: number = 1,
  ): Promise<void> {
    await this.centerRepository
      .createQueryBuilder()
      .update(Center)
      .set({
        currentEnrollment: () =>
          `GREATEST(currentEnrollment - ${decrement}, 0)`,
      })
      .where('id = :centerId', { centerId })
      .execute();
  }

  async searchCenters(searchTerm: string): Promise<Center[]> {
    return this.centerRepository
      .createQueryBuilder('center')
      .where(
        'center.name ILIKE :searchTerm OR center.description ILIKE :searchTerm OR center.city ILIKE :searchTerm',
        { searchTerm: `%${searchTerm}%` },
      )
      .orderBy('center.name', 'ASC')
      .getMany();
  }

  // Center management methods
  async getAllCenters(): Promise<Center[]> {
    return this.centerRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getCenterAdminCenters(centerIds: string[]): Promise<Center[]> {
    if (centerIds.length === 0) {
      return [];
    }

    return this.centerRepository.find({
      where: { id: { $in: centerIds } as any },
      order: { name: 'ASC' },
    });
  }

  async updateCenterActivation(
    centerId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.centerRepository.update(centerId, {
      status: isActive ? CenterStatus.ACTIVE : CenterStatus.INACTIVE,
    });
  }
}
