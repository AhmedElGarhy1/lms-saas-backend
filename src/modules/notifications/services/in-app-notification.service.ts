import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationRepository } from '../repositories/notification.repository';
import { Notification } from '../entities/notification.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { BaseService } from '@/shared/common/services/base.service';
import { NotificationEvents } from '@/shared/events/notification.events.enum';
import { NotificationReadEvent } from '../events/notification.events';
import { RateLimitService } from '@/modules/rate-limit/services/rate-limit.service';
import { ChannelRateLimitService } from './channel-rate-limit.service';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { Pagination } from 'nestjs-typeorm-paginate';
import { GetInAppNotificationsDto } from '../dto/in-app-notification.dto';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { Config } from '@/shared/config/config';
import { WebSocketConfig } from '../config/notification.config';

@Injectable()
export class InAppNotificationService extends BaseService {
  private readonly CACHE_TTL = 5 * 60; // 5 minutes

  private readonly redisKeyPrefix: string;
  private readonly rateLimitUser: number;
  private readonly rateLimitTTL: number = 60; // 1 minute in seconds

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly channelRateLimitService: ChannelRateLimitService,
    private readonly rateLimitService: RateLimitService,
  ) {
    super();
    this.redisKeyPrefix = Config.redis.keyPrefix;
    this.rateLimitUser = WebSocketConfig.rateLimit.user;
  }

  async create(payload: Partial<Notification>): Promise<Notification> {
    return this.notificationRepository.createNotification(payload);
  }

  async getUserNotifications(
    userId: string,
    query: GetInAppNotificationsDto,
  ): Promise<Pagination<Notification>> {
    return await this.notificationRepository.getUserNotificationsWithFilters(
      userId,
      query,
    );
  }

  async getUnreadNotifications(
    userId: string,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): Promise<Notification[]> {
    return this.notificationRepository.findUnread(
      userId,
      profileType,
      profileId,
    );
  }

  async getUnreadCount(
    userId: string,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): Promise<number> {
    // Get from database
    const count = await this.notificationRepository.getUnreadCount(
      userId,
      profileType,
      profileId,
    );

    return count;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification =
      await this.notificationRepository.findOne(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new ResourceNotFoundException(
        'Notification not found or access denied',
      );
    }

    await this.notificationRepository.markAsRead(notificationId, userId);

    // Emit event: notification read
    this.eventEmitter.emit(
      NotificationEvents.READ,
      new NotificationReadEvent(
        notificationId,
        userId,
        new Date(),
        notification.createdAt,
        notification.createdAt
          ? new Date().getTime() - notification.createdAt.getTime()
          : null,
      ),
    );
  }

  async markMultipleAsRead(
    notificationIds: string[],
    userId: string,
  ): Promise<void> {
    await this.notificationRepository.markMultipleAsRead(
      notificationIds,
      userId,
    );
  }

  async markAllAsRead(
    userId: string,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): Promise<void> {
    await this.notificationRepository.markAllAsRead(
      userId,
      profileType,
      profileId,
    );
  }

  async archive(userId: string, notificationId: string): Promise<void> {
    const notification =
      await this.notificationRepository.findOne(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new ResourceNotFoundException(
        'Notification not found or access denied',
      );
    }
    await this.notificationRepository.update(notificationId, {
      isArchived: true,
    });
  }

  async getArchivedNotifications(
    userId: string,
    query: BasePaginationDto,
  ): Promise<Pagination<Notification>> {
    return await this.notificationRepository.getArchivedNotificationsWithPagination(
      userId,
      query,
    );
  }

  /**
   * Check if user has exceeded rate limit for IN_APP notifications
   * Uses sliding window algorithm with channel-specific limits
   * @param userId - User ID to check rate limit for
   * @returns true if user is within rate limit, false if exceeded
   */
  async checkUserRateLimit(userId: string): Promise<boolean> {
    // Use channel-specific rate limiting
    return this.channelRateLimitService.checkChannelRateLimit(
      userId,
      NotificationChannel.IN_APP,
    );
  }

  /**
   * Get the current rate limit configuration for IN_APP channel
   * @returns Object with rate limit settings
   */
  getRateLimitConfig(): { limit: number; windowSeconds: number } {
    return this.channelRateLimitService.getChannelRateLimitConfig(
      NotificationChannel.IN_APP,
    );
  }
}
