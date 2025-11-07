import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { LoggerService } from '@/shared/services/logger.service';
import { UserService } from '@/modules/user/services/user.service';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { In } from 'typeorm';
import { Config } from '@/shared/config/config';

interface EventContext {
  priority?: number;
  eventType?: string;
  isSecurityEvent?: boolean;
}

@Injectable()
export class ChannelSelectionService {
  private readonly activityCache = new Map<
    string,
    { isActive: boolean; timestamp: number }
  >();
  private readonly cacheTTL: number;
  private readonly inactivityThresholdHours: number;

  constructor(
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
    private readonly logger: LoggerService,
  ) {
    // Cache TTL: 1 hour (in milliseconds)
    this.cacheTTL = 60 * 60 * 1000;
    // Inactivity threshold from config
    this.inactivityThresholdHours =
      Config.notification.inactivityThresholdHours;
  }

  /**
   * Select optimal channels based on user activity, urgency, and context
   */
  async selectOptimalChannels(
    userId: string,
    baseChannels: NotificationChannel[],
    eventContext: EventContext,
    priority?: number,
    requiresAudit?: boolean,
  ): Promise<NotificationChannel[]> {
    try {
      // Start with base channels
      let selectedChannels = [...baseChannels];
      const effectivePriority = priority ?? eventContext.priority ?? 0;

      // Helper to check if external channels exist
      const hasExternalChannel = () =>
        selectedChannels.includes(NotificationChannel.SMS) ||
        selectedChannels.includes(NotificationChannel.EMAIL) ||
        selectedChannels.includes(NotificationChannel.WHATSAPP);

      // Check if user is active
      const isActive = await this.isUserActive(userId);

      // Rule 1: Inactive users - prefer external channels over IN_APP
      if (!isActive && selectedChannels.includes(NotificationChannel.IN_APP)) {
        if (hasExternalChannel()) {
          selectedChannels = selectedChannels.filter(
            (ch) => ch !== NotificationChannel.IN_APP,
          );
          this.logger.debug(
            `User ${userId} is inactive, prioritizing external channels over IN_APP`,
            'ChannelSelectionService',
            { userId, isActive, selectedChannels },
          );
        }
      }

      // Rule 2: Critical events (priority >= 8) - ensure external channel exists
      if (effectivePriority >= 8 && !hasExternalChannel()) {
        // Add SMS as fallback for critical events if no external channel
        selectedChannels.push(NotificationChannel.SMS);
        this.logger.debug(
          `Critical event (priority ${effectivePriority}), added SMS channel`,
          'ChannelSelectionService',
          { userId, priority: effectivePriority, selectedChannels },
        );
      }

      // Ensure we don't return empty array
      if (selectedChannels.length === 0) {
        this.logger.warn(
          `Channel selection resulted in empty array, using baseChannels fallback`,
          'ChannelSelectionService',
          { userId, baseChannels },
        );
        return baseChannels;
      }

      return selectedChannels;
    } catch (error) {
      this.logger.error(
        `Failed to select optimal channels for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
        'ChannelSelectionService',
        { userId, baseChannels },
      );
      return baseChannels;
    }
  }

  /**
   * Check if user is active (logged in within threshold hours)
   */
  async isUserActive(
    userId: string,
    hoursThreshold?: number,
  ): Promise<boolean> {
    const threshold = hoursThreshold || this.inactivityThresholdHours;

    // Check cache first
    const cached = this.activityCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.isActive;
    }

    try {
      // Get user from service
      const user = await this.userService.findOne(userId);

      if (!user) {
        // User not found, assume inactive
        return false;
      }

      // Check if user has lastLogin or updatedAt field
      // Using updatedAt as proxy for activity (last profile update)
      const lastActivity = (user as any).lastLogin || user.updatedAt;
      if (!lastActivity) {
        // No activity data, assume inactive
        this.activityCache.set(userId, {
          isActive: false,
          timestamp: Date.now(),
        });
        return false;
      }

      const hoursSinceActivity =
        (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);
      const isActive = hoursSinceActivity < threshold;

      // Cache result
      this.activityCache.set(userId, {
        isActive,
        timestamp: Date.now(),
      });

      return isActive;
    } catch (error) {
      this.logger.error(
        `Failed to check user activity for ${userId}`,
        error instanceof Error ? error.stack : undefined,
        'ChannelSelectionService',
      );

      // On error, assume inactive (safer for critical notifications)
      return false;
    }
  }

  /**
   * Batch check user activity for multiple users (performance optimization)
   */
  async batchCheckUserActivity(
    userIds: string[],
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    const uncachedUserIds: string[] = [];

    // Check cache first
    for (const userId of userIds) {
      const cached = this.activityCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        result.set(userId, cached.isActive);
      } else {
        uncachedUserIds.push(userId);
      }
    }

    // Batch query for uncached users
    if (uncachedUserIds.length > 0) {
      try {
        const now = Date.now();
        const thresholdMs = this.inactivityThresholdHours * 60 * 60 * 1000;

        // Fetch users in batch using repository
        const users = await this.userRepository.findMany({
          where: {
            id: In(uncachedUserIds),
          },
          select: ['id', 'updatedAt'],
        });

        // Process batch results
        const userMap = new Map(users.map((user) => [user.id, user]));

        for (const userId of uncachedUserIds) {
          const user = userMap.get(userId);
          if (user) {
            // Use updatedAt as last activity indicator
            const lastActivity = user.updatedAt;
            const isActive = lastActivity
              ? now - new Date(lastActivity).getTime() < thresholdMs
              : false;

            result.set(userId, isActive);

            // Cache result
            this.activityCache.set(userId, {
              isActive,
              timestamp: now,
            });
          } else {
            // User not found, mark as inactive
            result.set(userId, false);
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to batch check user activity`,
          error instanceof Error ? error.stack : undefined,
          'ChannelSelectionService',
        );

        // On error, assume all uncached users are inactive
        for (const userId of uncachedUserIds) {
          if (!result.has(userId)) {
            result.set(userId, false);
          }
        }
      }
    }

    return result;
  }

  /**
   * Clear activity cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.activityCache.clear();
  }

  /**
   * Clear cache for specific user
   */
  clearUserCache(userId: string): void {
    this.activityCache.delete(userId);
  }
}
