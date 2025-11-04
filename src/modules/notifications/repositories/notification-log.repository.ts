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
    filters: {
      status?: NotificationStatus;
      channel?: NotificationChannel;
      type?: NotificationType;
      fromDate?: Date;
      toDate?: Date;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: NotificationLog[]; total: number }> {
    const queryBuilder = this.getRepository().createQueryBuilder('log');

    queryBuilder.where('log.userId = :userId', { userId });

    if (filters.status) {
      queryBuilder.andWhere('log.status = :status', { status: filters.status });
    }

    if (filters.channel) {
      queryBuilder.andWhere('log.channel = :channel', {
        channel: filters.channel,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('log.type = :type', { type: filters.type });
    }

    if (filters.fromDate) {
      queryBuilder.andWhere('log.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      queryBuilder.andWhere('log.createdAt <= :toDate', {
        toDate: filters.toDate,
      });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }
}
