import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityLog } from '../entities/activity-log.entity';
import { BaseRepository } from '../../../../common/repositories/base.repository';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { LoggerService } from '../../../../shared/services/logger.service';
import {
  ActivityType,
  ActivityLevel,
  ActivityScope,
} from '../entities/activity-log.entity';

@Injectable()
export class ActivityLogRepository extends BaseRepository<ActivityLog> {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    protected readonly logger: LoggerService,
  ) {
    super(activityLogRepository, logger);
  }

  // Single consolidated pagination method with filter options
  async paginateWithFilters(
    query: PaginateQuery,
    filters?: {
      centerId?: string;
      actorId?: string;
      type?: ActivityType;
      level?: ActivityLevel;
    },
  ): Promise<Paginated<ActivityLog>> {
    const options = {
      searchableColumns: [
        'action',
        'details',
        'actor.name',
        'actor.email',
        'center.name',
      ],
      sortableColumns: ['createdAt', 'updatedAt', 'action', 'level'],
      filterableColumns: ['centerId', 'actorId', 'type', 'level'],
      defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
      relations: ['actor', 'center'],
      defaultLimit: 10,
      maxLimit: 100,
    };

    // Apply filters if provided
    if (filters) {
      const filterQuery = { ...query };
      if (filters.centerId) {
        filterQuery.filter = {
          ...filterQuery.filter,
          centerId: filters.centerId,
        };
      }
      if (filters.actorId) {
        filterQuery.filter = {
          ...filterQuery.filter,
          actorId: filters.actorId,
        };
      }
      if (filters.type) {
        filterQuery.filter = {
          ...filterQuery.filter,
          type: filters.type,
        };
      }
      if (filters.level) {
        filterQuery.filter = {
          ...filterQuery.filter,
          level: filters.level,
        };
      }

      return super.paginate(filterQuery, options);
    }

    return super.paginate(query, options);
  }

  // Convenience methods that use the consolidated paginate method
  async paginateByCenterId(
    query: PaginateQuery,
    centerId: string,
  ): Promise<Paginated<ActivityLog>> {
    return this.paginateWithFilters(query, { centerId });
  }

  async paginateByActorId(
    query: PaginateQuery,
    actorId: string,
  ): Promise<Paginated<ActivityLog>> {
    return this.paginateWithFilters(query, { actorId });
  }

  async paginateByType(
    query: PaginateQuery,
    type: ActivityType,
  ): Promise<Paginated<ActivityLog>> {
    return this.paginateWithFilters(query, { type });
  }

  async paginateByLevel(
    query: PaginateQuery,
    level: ActivityLevel,
  ): Promise<Paginated<ActivityLog>> {
    return this.paginateWithFilters(query, { level });
  }

  async findActivityLogsByCenter(
    centerId: string,
    query: PaginateQuery,
  ): Promise<Paginated<ActivityLog>> {
    return this.paginateByCenterId(query, centerId);
  }

  async findActivityLogsByUser(
    userId: string,
    query: PaginateQuery,
  ): Promise<Paginated<ActivityLog>> {
    return this.paginateByActorId(query, userId);
  }

  async findGlobalActivityLogs(
    query: PaginateQuery,
  ): Promise<Paginated<ActivityLog>> {
    return this.paginateWithFilters(query);
  }

  async findActivityLogsByType(
    type: ActivityType,
    query: PaginateQuery,
  ): Promise<Paginated<ActivityLog>> {
    return this.paginateByType(query, type);
  }

  async findActivityLogsByLevel(
    level: ActivityLevel,
    query: PaginateQuery,
  ): Promise<Paginated<ActivityLog>> {
    return this.paginateByLevel(query, level);
  }

  async getActivityStats(centerId?: string): Promise<{
    total: number;
    byType: Record<ActivityType, number>;
    byLevel: Record<ActivityLevel, number>;
    byScope: Record<ActivityScope, number>;
    recentActivity: number;
  }> {
    const whereClause = centerId ? { centerId } : {};

    const [total, byType, byLevel, byScope, recentActivity] = await Promise.all(
      [
        this.activityLogRepository.count({ where: whereClause }),
        this.activityLogRepository
          .createQueryBuilder('log')
          .select('log.type', 'type')
          .addSelect('COUNT(*)', 'count')
          .where(
            centerId ? 'log.centerId = :centerId' : '1=1',
            centerId ? { centerId } : {},
          )
          .groupBy('log.type')
          .getRawMany(),
        this.activityLogRepository
          .createQueryBuilder('log')
          .select('log.level', 'level')
          .addSelect('COUNT(*)', 'count')
          .where(
            centerId ? 'log.centerId = :centerId' : '1=1',
            centerId ? { centerId } : {},
          )
          .groupBy('log.level')
          .getRawMany(),
        this.activityLogRepository
          .createQueryBuilder('log')
          .select('log.scope', 'scope')
          .addSelect('COUNT(*)', 'count')
          .where(
            centerId ? 'log.centerId = :centerId' : '1=1',
            centerId ? { centerId } : {},
          )
          .groupBy('log.scope')
          .getRawMany(),
        this.activityLogRepository.count({
          where: {
            ...whereClause,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        }),
      ],
    );

    return {
      total,
      byType: byType.reduce(
        (acc, item) => ({ ...acc, [item.type]: parseInt(item.count) }),
        {} as Record<ActivityType, number>,
      ),
      byLevel: byLevel.reduce(
        (acc, item) => ({ ...acc, [item.level]: parseInt(item.count) }),
        {} as Record<ActivityLevel, number>,
      ),
      byScope: byScope.reduce(
        (acc, item) => ({ ...acc, [item.scope]: parseInt(item.count) }),
        {} as Record<ActivityScope, number>,
      ),
      recentActivity,
    };
  }
}
