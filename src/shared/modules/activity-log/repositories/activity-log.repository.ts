import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityLog, ActivityType } from '../entities/activity-log.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Pagination } from 'nestjs-typeorm-paginate';
import { LoggerService } from '../../../../shared/services/logger.service';
import { PaginateActivityLogsDto } from '../dto/paginate-activity-logs.dto';

@Injectable()
export class ActivityLogRepository extends BaseRepository<ActivityLog> {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    protected readonly logger: LoggerService,
  ) {
    super(activityLogRepository, logger);
  }

  // Single consolidated pagination method
  async paginateActivityLogs(
    query: PaginateActivityLogsDto,
  ): Promise<Pagination<ActivityLog>> {
    // Create queryBuilder with relations
    const queryBuilder = this.activityLogRepository
      .createQueryBuilder('activityLog')
      .leftJoinAndSelect('activityLog.actor', 'actor')
      .leftJoinAndSelect('activityLog.center', 'center');

    // Apply custom filters
    if (query.centerId) {
      queryBuilder.andWhere('activityLog.centerId = :centerId', {
        centerId: query.centerId,
      });
    }

    if (query.actorId) {
      queryBuilder.andWhere('activityLog.actorId = :actorId', {
        actorId: query.actorId,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('activityLog.type = :type', { type: query.type });
    }

    if (query.level) {
      queryBuilder.andWhere('activityLog.level = :level', {
        level: query.level,
      });
    }

    return this.paginate(
      query,
      {
        searchableColumns: ['action', 'description'],
        sortableColumns: ['createdAt', 'updatedAt'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '/activity-logs',
      queryBuilder,
    );
  }

  // Convenience methods that use the main paginate method
  async paginateByCenterId(
    query: PaginateActivityLogsDto,
    centerId: string,
  ): Promise<Pagination<ActivityLog>> {
    const queryWithCenter = { ...query, centerId };
    return this.paginateActivityLogs(queryWithCenter);
  }

  async paginateByActorId(
    query: PaginateActivityLogsDto,
    actorId: string,
  ): Promise<Pagination<ActivityLog>> {
    const queryWithActor = { ...query, actorId };
    return this.paginateActivityLogs(queryWithActor);
  }

  async paginateByType(
    query: PaginateActivityLogsDto,
    type: ActivityType,
  ): Promise<Pagination<ActivityLog>> {
    const queryWithType = { ...query, type };
    return this.paginateActivityLogs(queryWithType);
  }

  async paginateByLevel(
    query: PaginateActivityLogsDto,
    level: string,
  ): Promise<Pagination<ActivityLog>> {
    const queryWithLevel = { ...query, level };
    return this.paginateActivityLogs(queryWithLevel);
  }

  // Method to get activity logs for a specific user
  async getActivityLogsForUser(
    query: PaginateActivityLogsDto,
    userId: string,
  ): Promise<Pagination<ActivityLog>> {
    const queryWithUser = { ...query, actorId: userId };
    return this.paginateActivityLogs(queryWithUser);
  }

  // Method to get activity logs for a specific center
  async getActivityLogsForCenter(
    query: PaginateActivityLogsDto,
    centerId: string,
  ): Promise<Pagination<ActivityLog>> {
    const queryWithCenter = { ...query, centerId };
    return this.paginateActivityLogs(queryWithCenter);
  }
}
