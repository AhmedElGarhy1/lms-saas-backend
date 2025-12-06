import { Injectable } from '@nestjs/common';
import { Notification } from '../entities/notification.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { FindManyOptions, In, MoreThanOrEqual } from 'typeorm';
import { Pagination } from '@/shared/common/types/pagination.types';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { GetInAppNotificationsDto } from '../dto/in-app-notification.dto';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class NotificationRepository extends BaseRepository<Notification> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Notification {
    return Notification;
  }

  async createNotification(data: Partial<Notification>): Promise<Notification> {
    return this.create(data);
  }

  async findByUserId(
    userId: string,
    options?: FindManyOptions<Notification> & {
      where?: any;
    },
  ): Promise<[Notification[], number]> {
    const repo = this.getRepository();
    const queryBuilder = repo.createQueryBuilder('notification');

    queryBuilder.where('notification.userId = :userId', { userId });

    // Handle readAt filter (null = unread, undefined = don't filter, any other value = read)
    if (options?.where?.readAt === null) {
      queryBuilder.andWhere('notification.readAt IS NULL');
    } else if (options?.where?.readAt === undefined) {
      queryBuilder.andWhere('notification.readAt IS NOT NULL');
    }

    // Handle other filters
    if (options?.where?.type) {
      queryBuilder.andWhere('notification.type = :type', {
        type: options.where.type,
      });
    }
    if (options?.where?.profileType !== undefined) {
      queryBuilder.andWhere('notification.profileType = :profileType', {
        profileType: options.where.profileType,
      });
    }
    if (options?.where?.isArchived !== undefined) {
      queryBuilder.andWhere('notification.isArchived = :isArchived', {
        isArchived: options.where.isArchived,
      });
    }

    queryBuilder.orderBy('notification.createdAt', 'DESC');

    if (options?.skip !== undefined) {
      queryBuilder.skip(options.skip);
    }
    if (options?.take !== undefined) {
      queryBuilder.take(options.take);
    }

    return queryBuilder.getManyAndCount();
  }

  async findUnread(
    userId: string,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): Promise<Notification[]> {
    const repo = this.getRepository();
    const queryBuilder = repo.createQueryBuilder('notification');
    queryBuilder.where('notification.userId = :userId', { userId });
    queryBuilder.andWhere('notification.readAt IS NULL');

    if (profileType !== undefined) {
      queryBuilder.andWhere('notification.profileType = :profileType', {
        profileType,
      });
    }
    if (profileId !== undefined) {
      queryBuilder.andWhere('notification.profileId = :profileId', {
        profileId,
      });
    }

    queryBuilder.orderBy('notification.createdAt', 'DESC');
    return queryBuilder.getMany();
  }

  async getUnreadCount(
    userId: string,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): Promise<number> {
    const repo = this.getRepository();
    const queryBuilder = repo.createQueryBuilder('notification');
    queryBuilder.where('notification.userId = :userId', { userId });
    queryBuilder.andWhere('notification.readAt IS NULL');

    if (profileType !== undefined) {
      queryBuilder.andWhere('notification.profileType = :profileType', {
        profileType,
      });
    }
    if (profileId !== undefined) {
      queryBuilder.andWhere('notification.profileId = :profileId', {
        profileId,
      });
    }

    return queryBuilder.getCount();
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const repo = this.getRepository();
    // First verify the notification belongs to the user
    const notification = await repo.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new ResourceNotFoundException('t.errors.notFound.generic', {
        resource: 't.common.labels.notification',
      });
    }
    await repo.update({ id: notificationId }, { readAt: new Date() });
  }

  async markAllAsRead(
    userId: string,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): Promise<void> {
    const repo = this.getRepository();
    const queryBuilder = repo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('readAt IS NULL');

    if (profileType !== undefined) {
      queryBuilder.andWhere('profileType = :profileType', { profileType });
    }
    if (profileId !== undefined) {
      queryBuilder.andWhere('profileId = :profileId', { profileId });
    }

    await queryBuilder.execute();
  }

  async markMultipleAsRead(
    notificationIds: string[],
    userId: string,
  ): Promise<void> {
    if (notificationIds.length === 0) return;

    const repo = this.getRepository();
    await repo.update(
      {
        id: In(notificationIds),
        userId,
      },
      { readAt: new Date() },
    );
  }

  async findNewSince(
    userId: string,
    lastReadAt: Date,
  ): Promise<Notification[]> {
    const repo = this.getRepository();
    return repo.find({
      where: {
        userId,
        createdAt: MoreThanOrEqual(lastReadAt),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findArchived(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<[Notification[], number]> {
    const repo = this.getRepository();
    return repo.findAndCount({
      where: {
        userId,
        isArchived: true,
      } as any,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async archiveOld(userId: string, days: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const repo = this.getRepository();
    await repo
      .createQueryBuilder()
      .update(Notification)
      .set({ isArchived: true })
      .where('userId = :userId', { userId })
      .andWhere('isArchived = :isArchived', { isArchived: false })
      .andWhere('readAt <= :cutoffDate', { cutoffDate })
      .execute();
  }

  async deleteExpired(): Promise<void> {
    const repo = this.getRepository();
    await repo
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('expiresAt <= :now', { now: new Date() })
      .execute();
  }

  async getUserNotificationsWithFilters(
    userId: string,
    query: GetInAppNotificationsDto,
  ): Promise<Pagination<Notification>> {
    const repo = this.getRepository();
    const queryBuilder = repo.createQueryBuilder('notification');

    queryBuilder.where('notification.userId = :userId', { userId });
    queryBuilder.andWhere('notification.isArchived = :isArchived', {
      isArchived: false,
    });

    // Handle read filter
    if (query.read !== undefined) {
      if (query.read) {
        queryBuilder.andWhere('notification.readAt IS NOT NULL');
      } else {
        queryBuilder.andWhere('notification.readAt IS NULL');
      }
    }

    // Handle type filter
    if (query.type) {
      queryBuilder.andWhere('notification.type = :type', { type: query.type });
    }

    // Handle profileType filter
    if (query.profileType !== undefined) {
      queryBuilder.andWhere('notification.profileType = :profileType', {
        profileType: query.profileType,
      });
    }

    // Default sort
    queryBuilder.orderBy('notification.createdAt', 'DESC');

    // Use repository's paginate method
    return this.paginate(
      query,
      {
        searchableColumns: ['title', 'message'],
        sortableColumns: ['createdAt', 'readAt', 'priority'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '/notifications/in-app',
      queryBuilder,
    );
  }

  async getArchivedNotificationsWithPagination(
    userId: string,
    query: BasePaginationDto,
  ): Promise<Pagination<Notification>> {
    const repo = this.getRepository();
    const queryBuilder = repo.createQueryBuilder('notification');

    queryBuilder.where('notification.userId = :userId', { userId });
    queryBuilder.andWhere('notification.isArchived = :isArchived', {
      isArchived: true,
    });
    queryBuilder.orderBy('notification.createdAt', 'DESC');

    return this.paginate(
      query,
      {
        searchableColumns: ['title', 'message'],
        sortableColumns: ['createdAt', 'readAt', 'priority'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '/notifications/in-app/archived',
      queryBuilder,
    );
  }
}
