import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ActivityLog } from '../entities/activity-log.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Pagination } from '@/shared/common/types/pagination.types';
import { PaginateActivityLogsDto } from '../dto/paginate-activity-logs.dto';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Brackets } from 'typeorm';

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

  async paginateActivityLogs(
    query: PaginateActivityLogsDto,
    actor: ActorUser,
  ): Promise<Pagination<ActivityLog>> {
    const { type } = query;

    const qb = this.getRepository()
      .createQueryBuilder('activityLog')
      .where(
        new Brackets((qb) => {
          qb.where(`"activityLog"."userId" = :userId`, {
            userId: actor.id,
          }).orWhere(`"activityLog"."targetUserId" = :targetUserId`, {
            targetUserId: actor.id,
          });
        }),
      )
      .leftJoin('activityLog.user', 'user')
      .leftJoin('activityLog.targetUser', 'targetUser')
      .leftJoin('activityLog.center', 'center')
      .addSelect([
        'user.id',
        'user.name',
        'targetUser.id',
        'targetUser.name',
        'center.id',
        'center.name',
      ]);

    if (type) {
      qb.andWhere(`"activityLog"."type" = :type`, { type });
    }

    const results = await this.paginate(
      query,
      {
        searchableColumns: ['action', 'description'],
        sortableColumns: ['createdAt', 'updatedAt'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '/activity-logs',
      qb,
    );

    return results;
  }
}
