import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationEventMapping } from '../config/notifications.map';
import { LoggerService } from '@/shared/services/logger.service';
import { UserService } from '@/modules/user/services/user.service';

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
    private readonly logger: LoggerService,
    private readonly config: ConfigService,
  ) {
    // Cache TTL: 1 hour (in milliseconds)
    this.cacheTTL = 60 * 60 * 1000;
    // Inactivity threshold: 24 hours by default
    this.inactivityThresholdHours =
      parseInt(
        this.config.get<string>(
          'NOTIFICATION_INACTIVITY_THRESHOLD_HOURS',
          '24',
        ),
        10,
      ) || 24;
  }

  /**
   * Select optimal channels based on user activity, urgency, and context
   */
  async selectOptimalChannels(
    userId: string,
    baseChannels: NotificationChannel[],
    eventContext: EventContext,
    mapping: NotificationEventMapping,
  ): Promise<NotificationChannel[]> {
    try {
      // Start with base channels
      let selectedChannels = [...baseChannels];

      // Check if user is active
      const isActive = await this.isUserActive(userId);

      // If user is inactive and has IN_APP in channels, prefer SMS/EMAIL
      if (!isActive && selectedChannels.includes(NotificationChannel.IN_APP)) {
        // For inactive users, prioritize external channels
        const hasExternalChannel =
          selectedChannels.includes(NotificationChannel.SMS) ||
          selectedChannels.includes(NotificationChannel.EMAIL) ||
          selectedChannels.includes(NotificationChannel.WHATSAPP);

        if (hasExternalChannel) {
          // Remove IN_APP for inactive users if external channels available
          selectedChannels = selectedChannels.filter(
            (ch) => ch !== NotificationChannel.IN_APP,
          );
          this.logger.debug(
            `User ${userId} is inactive, prioritizing external channels over IN_APP`,
            'ChannelSelectionService',
            {
              userId,
              isActive,
              selectedChannels,
            },
          );
        }
      }

      // For critical events (priority >= 8), force SMS/EMAIL even if IN_APP enabled
      if (
        eventContext.priority &&
        eventContext.priority >= 8 &&
        selectedChannels.includes(NotificationChannel.IN_APP)
      ) {
        const shouldForce = this.shouldForceUrgentChannel(
          eventContext.priority,
          selectedChannels,
        );
        if (shouldForce) {
          // Ensure at least one external channel for critical events
          if (
            !selectedChannels.includes(NotificationChannel.SMS) &&
            !selectedChannels.includes(NotificationChannel.EMAIL) &&
            !selectedChannels.includes(NotificationChannel.WHATSAPP)
          ) {
            // Add SMS as fallback for critical events
            selectedChannels.push(NotificationChannel.SMS);
            this.logger.debug(
              `Critical event (priority ${eventContext.priority}), added SMS channel`,
              'ChannelSelectionService',
              {
                userId,
                priority: eventContext.priority,
                selectedChannels,
              },
            );
          }
        }
      }

      // If selection fails or results in empty array, fallback to baseChannels
      if (selectedChannels.length === 0) {
        this.logger.warn(
          `Channel selection resulted in empty array, using baseChannels fallback`,
          'ChannelSelectionService',
          {
            userId,
            baseChannels,
          },
        );
        return baseChannels;
      }

      return selectedChannels;
    } catch (error) {
      this.logger.error(
        `Failed to select optimal channels for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
        'ChannelSelectionService',
        {
          userId,
          baseChannels,
        },
      );

      // Fallback to baseChannels
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
   * Determine if urgent channels should be forced for critical events
   */
  shouldForceUrgentChannel(
    priority: number,
    channels: NotificationChannel[],
  ): boolean {
    // Priority >= 8 requires external channel
    if (priority >= 8) {
      const hasExternalChannel =
        channels.includes(NotificationChannel.SMS) ||
        channels.includes(NotificationChannel.EMAIL) ||
        channels.includes(NotificationChannel.WHATSAPP);
      return !hasExternalChannel;
    }
    return false;
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

    // Batch query for uncached users (fetch individually for now)
    // TODO: Implement batch query if UserService.adds batch find method
    if (uncachedUserIds.length > 0) {
      try {
        const now = Date.now();
        const thresholdMs = this.inactivityThresholdHours * 60 * 60 * 1000;

        // Fetch users individually (can be optimized with batch query later)
        await Promise.all(
          uncachedUserIds.map(async (userId) => {
            try {
              const user = await this.userService.findOne(userId);
              if (user) {
                const lastActivity = (user as any).lastLogin || user.updatedAt;
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
                result.set(userId, false);
              }
            } catch (err) {
              // Individual user fetch failed, mark as inactive
              result.set(userId, false);
            }
          }),
        );

        // Mark any remaining uncached users as inactive
        for (const userId of uncachedUserIds) {
          if (!result.has(userId)) {
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
