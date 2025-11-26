import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
} from '@/modules/centers/events/center.events';
import {
  OtpEvent,
  PhoneVerifiedEvent,
} from '@/modules/auth/events/auth.events';
import { ValidateEvent } from '../types/event-notification-mapping.types';
import { RecipientInfo } from '../types/recipient-info.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { UserService } from '@/modules/user/services/user.service';
import { CentersService } from '@/modules/centers/services/centers.service';
import { NotificationListenerHelper } from './helpers/notification-listener.helper';

@Injectable()
export class NotificationListener {
  private readonly logger: Logger = new Logger(NotificationListener.name);

  constructor(
    private readonly helper: NotificationListenerHelper,
    private readonly userService: UserService,
    private readonly centersService: CentersService,
  ) {}

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
      email: center.email || null,
      locale: actor.userInfo?.locale || 'en',
      centerId: center.id,
    };

    // Admin recipient (creator)
    const admin: RecipientInfo = {
      userId: actor.id,
      profileId: actor.userProfileId,
      profileType: actor.profileType,
      phone: actor.getPhone(),
      email: null,
      locale: actor.userInfo?.locale || 'en',
      centerId: center.id,
    };

    // Send to owner audience
    await this.helper.validateAndTriggerNotification(
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
    await this.helper.validateAndTriggerNotification(
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
      email: null,
      locale: actor.userInfo?.locale || 'en',
      centerId: centerId,
    };

    const validRecipients = this.helper.validateRecipients(
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
    await this.helper.validateAndTriggerNotification(
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
      email: null,
      locale: user.userInfo.locale,
    };

    const validRecipients = this.helper.validateRecipients(
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
      timestamp: event.timestamp,
    };

    await this.helper.validateAndTriggerNotification(
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
      phone: user.getPhone(),
      email: null,
      locale: user.userInfo.locale,
      centerId: undefined,
    };

    const validRecipients = this.helper.validateRecipients(
      [recipient],
      NotificationType.PHONE_VERIFIED,
    );

    if (validRecipients.length === 0) {
      return;
    }

    await this.helper.validateAndTriggerNotification(
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
}
