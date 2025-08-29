import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityLog, ActivityType } from '../entities/activity-log.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { LoggerService } from '../../../../shared/services/logger.service';

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
    query: PaginationQuery,
    filters?: {
      centerId?: string;
      actorId?: string;
      type?: ActivityType;
      level?: string; // Assuming level is a string for now, as ActivityLevel was removed
    },
  ): Promise<Pagination<ActivityLog>> {
    // Create queryBuilder with relations
    const queryBuilder = this.activityLogRepository
      .createQueryBuilder('activityLog')
      .leftJoinAndSelect('activityLog.actor', 'actor')
      .leftJoinAndSelect('activityLog.center', 'center');

    // Apply filters if provided
    if (filters) {
      const filterOptions = {
        page: query.page,
        limit: query.limit,
        search: query.search,
        filter: { ...query.filter },
        sortBy: query.sortBy,
        searchableColumns: ['action', 'description'],
        sortableColumns: ['createdAt', 'updatedAt'],
        defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
      };

      if (filters.centerId) {
        filterOptions.filter.centerId = filters.centerId;
      }
      if (filters.actorId) {
        filterOptions.filter.actorId = filters.actorId;
      }
      if (filters.type) {
        filterOptions.filter.type = filters.type;
      }
      if (filters.level) {
        filterOptions.filter.level = filters.level;
      }

      return super.paginate(filterOptions, queryBuilder);
    }

    return super.paginate(
      {
        page: query.page,
        limit: query.limit,
        search: query.search,
        filter: query.filter,
        sortBy: query.sortBy,
        searchableColumns: ['action', 'description'],
        sortableColumns: ['createdAt', 'updatedAt'],
        defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
        route: '/activity-logs',
      },
      queryBuilder,
    );
  }

  // Convenience methods that use the consolidated paginate method
  async paginateByCenterId(
    query: PaginationQuery,
    centerId: string,
  ): Promise<Pagination<ActivityLog>> {
    return this.paginateWithFilters(query, { centerId });
  }

  async paginateByActorId(
    query: PaginationQuery,
    actorId: string,
  ): Promise<Pagination<ActivityLog>> {
    return this.paginateWithFilters(query, { actorId });
  }

  async paginateByType(
    query: PaginationQuery,
    type: ActivityType,
  ): Promise<Pagination<ActivityLog>> {
    return this.paginateWithFilters(query, { type });
  }

  async paginateByLevel(
    query: PaginationQuery,
    level: string, // Assuming level is a string for now, as ActivityLevel was removed
  ): Promise<Pagination<ActivityLog>> {
    return this.paginateWithFilters(query, { level });
  }

  async findActivityLogsByCenter(
    centerId: string,
    query: PaginationQuery,
  ): Promise<Pagination<ActivityLog>> {
    return this.paginateByCenterId(query, centerId);
  }

  async findActivityLogsByUser(
    userId: string,
    query: PaginationQuery,
  ): Promise<Pagination<ActivityLog>> {
    return this.paginateByActorId(query, userId);
  }

  async findGlobalActivityLogs(
    query: PaginationQuery,
  ): Promise<Pagination<ActivityLog>> {
    return this.paginateWithFilters(query);
  }

  async findActivityLogsByType(
    type: ActivityType,
    query: PaginationQuery,
  ): Promise<Pagination<ActivityLog>> {
    return this.paginateByType(query, type);
  }

  async findActivityLogsByLevel(
    level: string, // Assuming level is a string for now, as ActivityLevel was removed
    query: PaginationQuery,
  ): Promise<Pagination<ActivityLog>> {
    return this.paginateByLevel(query, level);
  }

  async getActivityStats(centerId?: string): Promise<{
    total: number;
    byType: Record<ActivityType, number>;
    byLevel: Record<string, number>; // Assuming level is a string for now, as ActivityLevel was removed
    byScope: Record<string, number>; // Assuming scope is a string for now, as ActivityScope was removed
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
        {} as Record<string, number>,
      ),
      byScope: byScope.reduce(
        (acc, item) => ({ ...acc, [item.scope]: parseInt(item.count) }),
        {} as Record<string, number>,
      ),
      recentActivity,
    };
  }
}
