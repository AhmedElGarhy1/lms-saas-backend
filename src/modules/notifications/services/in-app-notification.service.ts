import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationRepository } from '../repositories/notification.repository';
import { Notification } from '../entities/notification.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { LoggerService } from '@/shared/services/logger.service';
import { ConfigService } from '@nestjs/config';
import { NotificationEvents } from '@/shared/events/notification.events.enum';
import { NotificationReadEvent } from '../events/notification.events';
import { SlidingWindowRateLimiter } from '../utils/sliding-window-rate-limit';
import { ChannelRateLimitService } from './channel-rate-limit.service';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { Pagination } from 'nestjs-typeorm-paginate';
import { GetInAppNotificationsDto } from '../dto/in-app-notification.dto';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';

@Injectable()
export class InAppNotificationService {
  private readonly CACHE_TTL = 5 * 60; // 5 minutes

  private readonly redisKeyPrefix: string;
  private readonly rateLimitUser: number;
  private readonly rateLimitTTL: number = 60; // 1 minute in seconds
  private readonly rateLimiter: SlidingWindowRateLimiter;

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly channelRateLimitService: ChannelRateLimitService,
  ) {
    this.redisKeyPrefix =
      this.configService.get<string>('REDIS_KEY_PREFIX') || 'dev';
    this.rateLimitUser =
      parseInt(
        this.configService.get<string>('WEBSOCKET_RATE_LIMIT_USER', '100'),
        10,
      ) || 100;

    // Initialize sliding window rate limiter
    this.rateLimiter = new SlidingWindowRateLimiter(
      this.redisService,
      this.logger,
      this.redisKeyPrefix,
    );
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
    const cacheKey = this.getCacheKey(userId, profileType, profileId);

    // Try to get from cache
    const cached = await this.redisService.get(cacheKey);
    if (cached !== null) {
      return parseInt(cached, 10);
    }

    // Get from database
    const count = await this.notificationRepository.getUnreadCount(
      userId,
      profileType,
      profileId,
    );

    // Cache the result
    await this.redisService.set(cacheKey, count.toString(), this.CACHE_TTL);

    return count;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification =
      await this.notificationRepository.findOne(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found or access denied');
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

    void this.invalidateCache(userId).catch((err) =>
      this.logger.error(
        `Failed to invalidate cache for user ${userId}`,
        err instanceof Error ? err.stack : undefined,
        'InAppNotificationService',
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
    void this.invalidateCache(userId).catch((err) =>
      this.logger.error(
        `Failed to invalidate cache for user ${userId}`,
        err instanceof Error ? err.stack : undefined,
        'InAppNotificationService',
      ),
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
    void this.invalidateCache(userId, profileType, profileId).catch((err) =>
      this.logger.error(
        `Failed to invalidate cache for user ${userId}`,
        err instanceof Error ? err.stack : undefined,
        'InAppNotificationService',
      ),
    );
  }

  async archive(userId: string, notificationId: string): Promise<void> {
    const notification =
      await this.notificationRepository.findOne(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found or access denied');
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

  private getCacheKey(
    userId: string,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): string {
    const parts = [this.redisKeyPrefix, 'notification:unread:count', userId];
    if (profileType) parts.push(profileType);
    if (profileId) parts.push(profileId);
    return parts.join(':');
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

  private async invalidateCache(
    userId: string,
    profileType?: ProfileType | null,
    profileId?: string | null,
  ): Promise<void> {
    const cacheKey = this.getCacheKey(userId, profileType, profileId);
    await this.redisService.del(cacheKey);

    // Also invalidate wildcard patterns (user-level cache)
    const userLevelKey = this.getCacheKey(userId);
    if (cacheKey !== userLevelKey) {
      await this.redisService.del(userLevelKey);
    }

    this.logger.debug(
      `Invalidated unread count cache for user ${userId}`,
      undefined,
      { userId },
    );
  }
}
