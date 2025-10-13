import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityLog } from '../entities/activity-log.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Pagination } from 'nestjs-typeorm-paginate';
import { LoggerService } from '../../../../shared/services/logger.service';
import { PaginateActivityLogsDto } from '../dto/paginate-activity-logs.dto';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';

@Injectable()
export class ActivityLogRepository extends BaseRepository<ActivityLog> {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    protected readonly logger: LoggerService,
    protected readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(activityLogRepository, logger);
  }

  // Single consolidated pagination method
  async paginateActivityLogs(
    query: PaginateActivityLogsDto,
    actorId: string,
  ): Promise<Pagination<ActivityLog>> {
    const { centerId, userId, type } = query;

    // Create queryBuilder with relations
    const queryBuilder = this.activityLogRepository
      .createQueryBuilder('activityLog')
      .leftJoinAndSelect('activityLog.actor', 'actor')
      .leftJoinAndSelect('activityLog.center', 'center');

    const isSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(actorId);

    // apply center access
    if (!isSuperAdmin && !centerId) {
      queryBuilder.andWhere(
        'activityLog.centerId IN (SELECT centerId FROM center_access WHERE userId = :actorId AND global = true)',
        {
          actorId,
        },
      );
    }

    // apply user access
    const bypassUserAccess =
      await this.accessControlHelperService.bypassUserAccess(actorId, centerId);
    if (!bypassUserAccess) {
      queryBuilder.andWhere(
        `activityLog.userId IN (SELECT userId FROM user_access WHERE ${centerId ? 'centerId = :centerId AND' : ''} granterUserId = :actorId)`,
        {
          actorId,
          centerId,
        },
      );
    }

    // Apply custom filters
    if (centerId) {
      queryBuilder.andWhere('activityLog.centerId = :centerId', {
        centerId: centerId,
      });
    }

    if (userId) {
      queryBuilder.andWhere('activityLog.userId = :userId', {
        userId: userId,
      });
    }

    if (type) {
      queryBuilder.andWhere('activityLog.type = :type', { type: type });
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
}
