import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationLog } from '../entities/notification-log.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { Pagination } from 'nestjs-typeorm-paginate';
import { GetNotificationHistoryDto } from '../dto/notification-history.dto';

@Injectable()
export class NotificationLogRepository extends BaseRepository<NotificationLog> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof NotificationLog {
    return NotificationLog;
  }

  async findByUserId(userId: string): Promise<NotificationLog[]> {
    return this.findMany({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByCenterId(centerId: string): Promise<NotificationLog[]> {
    return this.findMany({
      where: { centerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: NotificationStatus): Promise<NotificationLog[]> {
    return this.findMany({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  async findByType(type: NotificationType): Promise<NotificationLog[]> {
    return this.findMany({
      where: { type },
      order: { createdAt: 'DESC' },
    });
  }

  async findByChannel(
    channel: NotificationChannel,
  ): Promise<NotificationLog[]> {
    return this.findMany({
      where: { channel },
      order: { createdAt: 'DESC' },
    });
  }

  async findUserHistory(
    userId: string,
    query: GetNotificationHistoryDto,
  ): Promise<Pagination<NotificationLog>> {
    const queryBuilder = this.getRepository().createQueryBuilder('log');

    queryBuilder.where('log.userId = :userId', { userId });

    if (query.status) {
      queryBuilder.andWhere('log.status = :status', { status: query.status });
    }

    if (query.channel) {
      queryBuilder.andWhere('log.channel = :channel', {
        channel: query.channel,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('log.type = :type', { type: query.type });
    }

    // Default sort
    queryBuilder.orderBy('log.createdAt', 'DESC');

    // Use repository's paginate method (it handles dateFrom/dateTo automatically)
    return this.paginate(
      query,
      {
        searchableColumns: ['recipient'],
        sortableColumns: ['createdAt', 'status', 'channel', 'type'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '/notifications/history',
      queryBuilder,
    );
  }
}
