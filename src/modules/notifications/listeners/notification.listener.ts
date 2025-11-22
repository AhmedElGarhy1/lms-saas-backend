import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
} from '@/modules/centers/events/center.events';
import {
  PasswordResetRequestedEvent,
  EmailVerificationRequestedEvent,
  OtpEvent,
  PhoneVerifiedEvent,
  AccountLockedEvent,
} from '@/modules/auth/events/auth.events';
import { ValidateEvent } from '../types/event-notification-mapping.types';
import { RecipientInfo } from '../types/recipient-info.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { UserService } from '@/modules/user/services/user.service';
import { CentersService } from '@/modules/centers/services/centers.service';
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { NotificationEvent } from '../types/notification-event.types';

@Injectable()
export class NotificationListener {
  private readonly logger: Logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly moduleRef: ModuleRef,
    private readonly userService: UserService,
    private readonly centersService: CentersService,
    private readonly manifestResolver: NotificationManifestResolver,
  ) {}

  /**
   * Validate that event data contains all required template variables
   * This provides early detection of missing data before rendering
   * @param notificationType - Notification type
   * @param audience - Audience identifier
   * @param eventData - Event data to validate
   * @returns Array of missing variable names (format: "channel:variable"), empty if all present
   */
  private validateEventData(
    notificationType: NotificationType,
    audience: string,
    eventData: NotificationEvent | Record<string, unknown>,
  ): string[] {
    try {
      const manifest = this.manifestResolver.getManifest(notificationType);
      const audienceConfig = this.manifestResolver.getAudienceConfig(
        manifest,
        audience,
      );

      if (!audienceConfig) {
        return [];
      }

      const missing: string[] = [];

      // Check all channels for required variables
      for (const [channel, channelConfig] of Object.entries(
        audienceConfig.channels,
      )) {
        if (!channelConfig?.requiredVariables) {
          continue;
        }

        for (const variable of channelConfig.requiredVariables) {
          const eventObj = eventData as Record<string, unknown>;
          if (
            !(variable in eventObj) ||
            eventObj[variable] === null ||
            eventObj[variable] === undefined
          ) {
            missing.push(`${channel}:${variable}`);
          }
        }
      }

      return missing;
    } catch (error) {
      // If manifest resolution fails, return empty (will be caught later)
      this.logger.warn(
        `Failed to validate event data for ${notificationType}:${audience}`,
        {
          notificationType,
          audience,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return [];
    }
  }

  /**
   * Validate event data and trigger notification with comprehensive error handling
   * This helper method centralizes validation, logging, and error handling logic
   */
  private async validateAndTriggerNotification(
    notificationType: NotificationType,
    audience: string,
    event: NotificationEvent | Record<string, unknown>,
    recipients: RecipientInfo[],
    options?: {
      channels?: NotificationChannel[];
      context?: Record<string, unknown>;
    },
  ): Promise<void> {
    const { channels, context = {} } = options || {};

    // Early validation: Check if required template variables are present
    const missingVariables = this.validateEventData(
      notificationType,
      audience,
      event,
    );

    if (missingVariables.length > 0) {
      this.logger.error(
        `${notificationType} notification will fail - Missing required template variables: ${missingVariables.join(', ')}`,
        {
          notificationType,
          audience,
          missingVariables,
          eventDataKeys: Object.keys(event).join(', '),
          ...context,
        },
      );
    }

    try {
      await this.notificationService.trigger(notificationType, {
        audience,
        event,
        recipients,
        channels,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const extractedMissing = this.extractMissingVariables(errorMessage);

      this.logger.error(
        `Failed to send ${notificationType} notification${extractedMissing ? ` - Missing variables: ${extractedMissing.join(', ')}` : ''}`,
        error,
        {
          notificationType,
          audience,
          error: errorMessage,
          missingVariables: extractedMissing || missingVariables,
          eventDataKeys: Object.keys(event).join(', '),
          ...context,
        },
      );
      throw error;
    }
  }

  /**
   * Extract missing variables from error message
   */
  private extractMissingVariables(errorMessage: string): string[] | undefined {
    const match = errorMessage.match(
      /Missing required template variables.*?: (.+)$/,
    );
    return match ? match[1].split(', ').map((v) => v.trim()) : undefined;
  }

  /**
   * Validate recipients - phone and locale are always required
   * @param recipients - Array of recipients to validate
   * @param notificationType - Notification type for logging context
   * @returns Array of valid recipients
   */
  private validateRecipients(
    recipients: RecipientInfo[],
    notificationType: NotificationType,
  ): RecipientInfo[] {
    return recipients.filter((r) => {
      if (!r.phone) {
        this.logger.warn(
          `Recipient ${r.userId} missing required phone, skipping`,
          { userId: r.userId, notificationType },
        );
        return false;
      }
      if (!r.locale) {
        this.logger.warn(
          `Recipient ${r.userId} missing required locale, skipping`,
          { userId: r.userId, notificationType },
        );
        return false;
      }
      return true;
    });
  }

  @OnEvent(CenterEvents.CREATED)
  async handleCenterCreated(
    event: ValidateEvent<CreateCenterEvent, CenterEvents.CREATED>,
  ) {
    const { actor, center } = event;

    // For now, use actor for both audiences
    // TODO: Fetch actual owner from center.ownerId when available
    const owner: RecipientInfo = {
      userId: actor.id, // TODO: Use center.ownerId when available
      profileId: actor.userProfileId,
      profileType: actor.profileType,
      phone: actor.getPhone(),
      email: center.email || actor.email || null,
      locale: actor.userInfo?.locale || 'en',
      centerId: center.id,
    };

    // Admin recipient (creator)
    const admin: RecipientInfo = {
      userId: actor.id,
      profileId: actor.userProfileId,
      profileType: actor.profileType,
      phone: actor.getPhone(),
      email: actor.email || null,
      locale: actor.userInfo?.locale || 'en',
      centerId: center.id,
    };

    // Send to owner audience
    await this.validateAndTriggerNotification(
      NotificationType.CENTER_CREATED,
      'OWNER',
      event,
      [owner],
      {
        context: {
          centerId: center.id,
        },
      },
    );

    // Send to admin audience
    await this.validateAndTriggerNotification(
      NotificationType.CENTER_CREATED,
      'ADMIN',
      event,
      [admin],
      {
        context: {
          centerId: center.id,
          adminId: actor.id,
        },
      },
    );
  }

  @OnEvent(CenterEvents.UPDATED)
  async handleCenterUpdated(
    event: ValidateEvent<UpdateCenterEvent, CenterEvents.UPDATED>,
  ) {
    const { actor, centerId } = event;

    // Fetch center from database (required for template)
    let center: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      website?: string;
      description?: string;
      isActive: boolean;
    } | null = null;
    try {
      const centerEntity = await this.centersService.findCenterById(centerId);
      center = {
        id: centerEntity.id,
        name: centerEntity.name,
        email: centerEntity.email || undefined,
        phone: centerEntity.phone || undefined,
        website: centerEntity.website || undefined,
        description: centerEntity.description || undefined,
        isActive: centerEntity.isActive,
      };
    } catch (error) {
      this.logger.warn(
        `Center ${centerId} not found for CENTER_UPDATED notification`,
        {
          centerId,
          userId: actor.id,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Continue anyway - notification will fail validation but won't crash
    }

    const recipient: RecipientInfo = {
      userId: actor.id,
      profileId: actor.userProfileId,
      profileType: actor.profileType,
      phone: actor.getPhone(),
      email: actor.email || null,
      locale: actor.userInfo?.locale || 'en',
      centerId: centerId,
    };

    const validRecipients = this.validateRecipients(
      [recipient],
      NotificationType.CENTER_UPDATED,
    );

    if (validRecipients.length === 0) {
      return;
    }

    // Add center to event data (required by template)
    const eventWithCenter = {
      ...event,
      center: center || undefined,
    };

    // Use helper method for validation and triggering
    await this.validateAndTriggerNotification(
      NotificationType.CENTER_UPDATED,
      'DEFAULT',
      eventWithCenter,
      validRecipients,
      {
        context: {
          centerId,
          userId: actor.id,
          centerFetched: center !== null,
        },
      },
    );
  }

  @OnEvent(AuthEvents.PASSWORD_RESET_REQUESTED)
  async handlePasswordResetRequested(
    event: ValidateEvent<
      PasswordResetRequestedEvent,
      AuthEvents.PASSWORD_RESET_REQUESTED
    >,
  ) {
    // Fetch user to get phone and locale
    if (!event.userId) {
      this.logger.warn(
        'Password reset event missing userId, skipping notification',
      );
      return;
    }

    const user = await this.userService.findOne(event.userId);

    if (!user) {
      this.logger.warn(
        `User ${event.userId} not found for password reset notification`,
      );
      return;
    }

    const recipient: RecipientInfo = {
      userId: user.id,
      profileId: null,
      profileType: null,
      phone: user.getPhone(),
      email: event.email,
      locale: user.userInfo.locale,
    };

    const validRecipients = this.validateRecipients(
      [recipient],
      NotificationType.PASSWORD_RESET,
    );

    if (validRecipients.length === 0) {
      return;
    }

    await this.validateAndTriggerNotification(
      NotificationType.PASSWORD_RESET,
      'DEFAULT',
      event,
      validRecipients,
      {
        context: {
          userId: user.id,
        },
      },
    );
  }

  @OnEvent(AuthEvents.EMAIL_VERIFICATION_REQUESTED)
  async handleEmailVerificationRequested(
    event: ValidateEvent<
      EmailVerificationRequestedEvent,
      AuthEvents.EMAIL_VERIFICATION_REQUESTED
    >,
  ) {
    const { actor } = event;
    const recipient: RecipientInfo = {
      userId: actor.id,
      profileId: null,
      profileType: null,
      phone: actor.getPhone(),
      email: actor.email || null,
      locale: actor.userInfo.locale,
      centerId: undefined,
    };

    const validRecipients = this.validateRecipients(
      [recipient],
      NotificationType.EMAIL_VERIFICATION,
    );

    if (validRecipients.length === 0) {
      return;
    }

    await this.validateAndTriggerNotification(
      NotificationType.EMAIL_VERIFICATION,
      'DEFAULT',
      event,
      validRecipients,
      {
        context: {
          userId: actor.id,
        },
      },
    );
  }

  @OnEvent(AuthEvents.OTP)
  async handleOtp(event: ValidateEvent<OtpEvent, AuthEvents.OTP>) {
    // Fetch user to get phone and locale
    if (!event.userId) {
      this.logger.warn('OTP event missing userId, skipping notification');
      return;
    }

    const user = await this.userService.findOne(event.userId);

    if (!user) {
      this.logger.warn(`User ${event.userId} not found for OTP notification`);
      return;
    }

    const recipient: RecipientInfo = {
      userId: user.id,
      profileId: null,
      profileType: null,
      phone: user.getPhone(),
      email: event.email || null,
      locale: user.userInfo.locale,
    };

    const validRecipients = this.validateRecipients(
      [recipient],
      NotificationType.OTP,
    );

    if (validRecipients.length === 0) {
      return;
    }

    // Spread event to ensure all properties are accessible
    const eventData = {
      userId: event.userId,
      otpCode: event.otpCode,
      expiresIn: event.expiresIn,
      email: event.email,
      phone: event.phone,
      timestamp: event.timestamp,
    };

    await this.validateAndTriggerNotification(
      NotificationType.OTP,
      'DEFAULT',
      eventData,
      validRecipients,
      {
        channels: [NotificationChannel.SMS],
        context: {
          userId: user.id,
        },
      },
    );
  }

  @OnEvent(AuthEvents.PHONE_VERIFIED)
  async handlePhoneVerified(
    event: ValidateEvent<PhoneVerifiedEvent, AuthEvents.PHONE_VERIFIED>,
  ) {
    // Fetch user to get locale and ensure user exists
    // Note: event.userId is the target user (not actor)
    if (!event.userId) {
      this.logger.warn(
        'Phone verified event missing userId, skipping notification',
      );
      return;
    }

    const user = await this.userService.findOne(event.userId);

    if (!user) {
      this.logger.warn(
        `User ${event.userId} not found for phone verified notification`,
      );
      return;
    }

    const recipient: RecipientInfo = {
      userId: user.id,
      profileId: null,
      profileType: null,
      phone: event.phone || user.getPhone(),
      email: null,
      locale: user.userInfo.locale,
      centerId: undefined,
    };

    const validRecipients = this.validateRecipients(
      [recipient],
      NotificationType.PHONE_VERIFIED,
    );

    if (validRecipients.length === 0) {
      return;
    }

    await this.validateAndTriggerNotification(
      NotificationType.PHONE_VERIFIED,
      'DEFAULT',
      event,
      validRecipients,
      {
        channels: [NotificationChannel.SMS, NotificationChannel.IN_APP],
        context: {
          userId: user.id,
        },
      },
    );
  }

  @OnEvent(AuthEvents.ACCOUNT_LOCKED)
  async handleAccountLocked(
    event: ValidateEvent<AccountLockedEvent, AuthEvents.ACCOUNT_LOCKED>,
  ) {
    // Fetch user to get locale and ensure user exists
    if (!event.userId) {
      this.logger.warn(
        'Account locked event missing userId, skipping notification',
      );
      return;
    }

    const user = await this.userService.findOne(event.userId);

    if (!user) {
      this.logger.warn(
        `User ${event.userId} not found for account locked notification`,
      );
      return;
    }

    const recipient: RecipientInfo = {
      userId: user.id,
      profileId: null,
      profileType: null,
      phone: event.phone || user.getPhone(),
      email: null,
      locale: user.userInfo.locale,
      centerId: undefined,
    };

    const validRecipients = this.validateRecipients(
      [recipient],
      NotificationType.ACCOUNT_LOCKED,
    );

    if (validRecipients.length === 0) {
      return;
    }

    // Format lockout duration based on locale
    const lockoutDurationMinutes = event.lockoutDurationMinutes;
    const lockoutDuration =
      user.userInfo.locale === 'ar'
        ? `${lockoutDurationMinutes} دقيقة`
        : `${lockoutDurationMinutes} ${lockoutDurationMinutes === 1 ? 'minute' : 'minutes'}`;

    // Prepare event data with formatted duration
    const eventData = {
      userId: event.userId,
      phone: event.phone,
      lockoutDurationMinutes: event.lockoutDurationMinutes,
      lockoutDuration,
      timestamp: event.timestamp,
    };

    await this.validateAndTriggerNotification(
      NotificationType.ACCOUNT_LOCKED,
      'DEFAULT',
      eventData,
      validRecipients,
      {
        channels: [NotificationChannel.WHATSAPP],
        context: {
          userId: user.id,
        },
      },
    );
  }
}
