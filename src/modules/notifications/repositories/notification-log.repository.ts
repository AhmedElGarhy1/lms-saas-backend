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
import { In } from 'typeorm';

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

  /**
   * Delete old failed notification logs older than cutoff date
   * Used by DLQ cleanup job
   */
  async deleteOldFailedLogs(cutoffDate: Date): Promise<number> {
    const repo = this.getRepository();
    const deleteResult = await repo
      .createQueryBuilder()
      .delete()
      .from(NotificationLog)
      .where('status = :status', { status: NotificationStatus.FAILED })
      .andWhere('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return deleteResult.affected || 0;
  }

  /**
   * Batch lookup logs by multiple jobIds
   * Returns a Map of jobId -> NotificationLog (most recent log for each jobId)
   * Useful for bulk operations when processing multiple notifications
   *
   * @param jobIds - Array of job IDs to lookup
   * @returns Map of jobId to most recent NotificationLog
   */
  async findLogsByJobIds(
    jobIds: string[],
  ): Promise<Map<string, NotificationLog>> {
    if (jobIds.length === 0) {
      return new Map();
    }

    // Use IN clause for efficient batch lookup
    const logs = await this.findMany({
      where: {
        jobId: In(jobIds),
      },
      order: { createdAt: 'DESC' },
    });

    // Group by jobId, taking the most recent log for each jobId
    const logMap = new Map<string, NotificationLog>();
    for (const log of logs) {
      if (log.jobId && !logMap.has(log.jobId)) {
        logMap.set(log.jobId, log);
      }
    }

    return logMap;
  }

  /**
   * Batch lookup logs by multiple criteria
   * Finds logs matching any of the provided criteria (userId, type, channel, status combinations)
   * Returns a Map keyed by a composite key for efficient lookup
   *
   * @param criteria - Array of search criteria objects
   * @returns Map of composite key (userId:type:channel) to most recent NotificationLog
   */
  async findLogsByCriteria(
    criteria: Array<{
      userId: string;
      type: NotificationType;
      channel: NotificationChannel;
      statuses?: NotificationStatus[];
    }>,
  ): Promise<Map<string, NotificationLog>> {
    if (criteria.length === 0) {
      return new Map();
    }

    // Build OR conditions for all criteria
    const whereConditions = criteria.flatMap((c) => {
      if (c.statuses && c.statuses.length > 0) {
        // If statuses provided, create condition for each status
        return c.statuses.map((status) => ({
          userId: c.userId,
          type: c.type,
          channel: c.channel,
          status,
        }));
      }
      // No status filter - match any status
      return [
        {
          userId: c.userId,
          type: c.type,
          channel: c.channel,
        },
      ];
    });

    const logs = await this.findMany({
      where: whereConditions,
      order: { createdAt: 'DESC' },
    });

    // Group by composite key (userId:type:channel), taking most recent
    const logMap = new Map<string, NotificationLog>();
    for (const log of logs) {
      const key = `${log.userId}:${log.type}:${log.channel}`;
      if (!logMap.has(key)) {
        logMap.set(key, log);
      }
    }

    return logMap;
  }

  /**
   * Batch update logs by IDs
   * More efficient than individual updates when updating multiple logs
   *
   * @param updates - Array of { id, data } objects to update
   */
  async batchUpdate(
    updates: Array<{ id: string; data: Partial<NotificationLog> }>,
  ): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    // Use Promise.all for parallel updates (within transaction if available)
    await Promise.all(
      updates.map((update) =>
        this.getRepository().update(update.id, update.data),
      ),
    );
  }
}
