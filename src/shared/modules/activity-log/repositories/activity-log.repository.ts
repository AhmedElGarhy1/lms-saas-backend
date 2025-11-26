import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ActivityLog } from '../entities/activity-log.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Pagination } from 'nestjs-typeorm-paginate';
import { PaginateActivityLogsDto } from '../dto/paginate-activity-logs.dto';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class ActivityLogRepository extends BaseRepository<ActivityLog> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof ActivityLog {
    return ActivityLog;
  }

  // Single consolidated pagination method
  async paginateActivityLogs(
    query: PaginateActivityLogsDto,
    actor: ActorUser,
  ): Promise<Pagination<ActivityLog>> {
    const { centerId, userId, type } = query;

    // Create queryBuilder with relations
    const queryBuilder = this.getRepository()
      .createQueryBuilder('activityLog')
      .where('activityLog.userId = :userId', { userId: actor.id })
      .orWhere('activityLog.targetUserId = :targetUserId', {
        targetUserId: actor.id,
      })
      .leftJoin('activityLog.user', 'user') // Who performed the action
      .leftJoin('activityLog.targetUser', 'targetUser') // Who was affected
      .leftJoin('activityLog.center', 'center')
      .addSelect(['user.name', 'targetUser.name', 'center.name']);

    // const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
    //   actor.userProfileId,
    // );

    // // apply center access
    // if (!isSuperAdmin && !centerId) {
    //   queryBuilder.andWhere(
    //     'activityLog."centerId" IN (SELECT "centerId" FROM center_access WHERE "userProfileId" = :userProfileId)',
    //     {
    //       userProfileId: actor.userProfileId,
    //     },
    //   );
    // }

    // apply user access (filter by targetUserId - who was affected)
    const bypassUserAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        centerId,
      );
    if (!bypassUserAccess) {
      queryBuilder.andWhere(
        `activityLog."targetUserId" IN (SELECT "userId" FROM user_access WHERE ${centerId ? '"centerId" = :centerId AND' : ''} "granterUserId" = :userProfileId)`,
        {
          userProfileId: actor.userProfileId,
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
      // Filter by targetUserId (who was affected)
      queryBuilder.andWhere('activityLog.targetUserId = :targetUserId', {
        targetUserId: userId,
      });
    }

    if (type) {
      queryBuilder.andWhere('activityLog.type = :type', { type: type });
    }

    const results = await this.paginate(
      query,
      {
        searchableColumns: ['action', 'description'],
        sortableColumns: ['createdAt', 'updatedAt'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '/activity-logs',
      queryBuilder,
    );

    console.log(results);
    return results;
  }
}
