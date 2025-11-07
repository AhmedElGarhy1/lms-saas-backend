import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { LoggerService } from '@/shared/services/logger.service';
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
} from '@/modules/auth/events/auth.events';
import { ValidateEvent } from '../types/event-notification-mapping.types';
import { RecipientInfo } from '../types/recipient-info.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { UserService } from '@/modules/user/services/user.service';

@Injectable()
export class NotificationListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService,
    private readonly userService: UserService,
  ) {}

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
          'NotificationListener',
          { userId: r.userId, notificationType },
        );
        return false;
      }
      if (!r.locale) {
        this.logger.warn(
          `Recipient ${r.userId} missing required locale, skipping`,
          'NotificationListener',
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
    try {
      await this.notificationService.trigger(NotificationType.CENTER_CREATED, {
        audience: 'OWNER',
        event,
        recipients: [owner],
      });
    } catch (error) {
      this.logger.error(
        `Failed to send CENTER_CREATED notification to OWNER audience`,
        error instanceof Error ? error.stack : undefined,
        'NotificationListener',
        {
          centerId: center.id,
          notificationType: NotificationType.CENTER_CREATED,
          audience: 'OWNER',
        },
      );
    }

    // Send to admin audience
    try {
      await this.notificationService.trigger(NotificationType.CENTER_CREATED, {
        audience: 'ADMIN',
        event,
        recipients: [admin],
      });
    } catch (error) {
      this.logger.error(
        `Failed to send CENTER_CREATED notification to ADMIN audience`,
        error instanceof Error ? error.stack : undefined,
        'NotificationListener',
        {
          centerId: center.id,
          adminId: actor.id,
          notificationType: NotificationType.CENTER_CREATED,
          audience: 'ADMIN',
        },
      );
    }
  }

  @OnEvent(CenterEvents.UPDATED)
  async handleCenterUpdated(
    event: ValidateEvent<UpdateCenterEvent, CenterEvents.UPDATED>,
  ) {
    const { actor } = event;
    const recipient: RecipientInfo = {
      userId: actor.id,
      profileId: actor.userProfileId,
      profileType: actor.profileType,
      phone: actor.getPhone(),
      email: actor.email || null,
      locale: actor.userInfo?.locale || 'en',
      centerId: actor.centerId || null,
    };

    const validRecipients = this.validateRecipients(
      [recipient],
      NotificationType.CENTER_UPDATED,
    );

    if (validRecipients.length === 0) {
      return;
    }

    try {
      await this.notificationService.trigger(NotificationType.CENTER_UPDATED, {
        audience: 'DEFAULT',
        event,
        recipients: validRecipients,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send CENTER_UPDATED notification`,
        error instanceof Error ? error.stack : undefined,
        'NotificationListener',
        {
          centerId: actor.centerId,
          userId: actor.id,
          notificationType: NotificationType.CENTER_UPDATED,
          audience: 'DEFAULT',
        },
      );
    }
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
        'NotificationListener',
      );
      return;
    }

    const user = await this.userService.findOne(event.userId);

    if (!user) {
      this.logger.warn(
        `User ${event.userId} not found for password reset notification`,
        'NotificationListener',
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

    try {
      await this.notificationService.trigger(NotificationType.PASSWORD_RESET, {
        audience: 'DEFAULT',
        event,
        recipients: validRecipients,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send PASSWORD_RESET notification`,
        error instanceof Error ? error.stack : undefined,
        'NotificationListener',
        {
          userId: user.id,
          notificationType: NotificationType.PASSWORD_RESET,
          audience: 'DEFAULT',
        },
      );
    }
  }

  @OnEvent(AuthEvents.EMAIL_VERIFICATION_REQUESTED)
  async handleEmailVerificationRequested(
    event: ValidateEvent<
      EmailVerificationRequestedEvent,
      AuthEvents.EMAIL_VERIFICATION_REQUESTED
    >,
  ) {
    // Fetch user to get phone and locale
    if (!event.userId) {
      this.logger.warn(
        'Email verification event missing userId, skipping notification',
        'NotificationListener',
      );
      return;
    }

    const user = await this.userService.findOne(event.userId);

    if (!user) {
      this.logger.warn(
        `User ${event.userId} not found for email verification notification`,
        'NotificationListener',
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
      centerId: undefined,
    };

    const validRecipients = this.validateRecipients(
      [recipient],
      NotificationType.EMAIL_VERIFICATION,
    );

    if (validRecipients.length === 0) {
      return;
    }

    try {
      await this.notificationService.trigger(
        NotificationType.EMAIL_VERIFICATION,
        {
          audience: 'DEFAULT',
          event,
          recipients: validRecipients,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send EMAIL_VERIFICATION notification`,
        error instanceof Error ? error.stack : undefined,
        'NotificationListener',
        {
          userId: user.id,
          notificationType: NotificationType.EMAIL_VERIFICATION,
          audience: 'DEFAULT',
        },
      );
    }
  }

  @OnEvent(AuthEvents.OTP)
  async handleOtp(event: ValidateEvent<OtpEvent, AuthEvents.OTP>) {
    // Fetch user to get phone and locale
    if (!event.userId) {
      this.logger.warn(
        'OTP event missing userId, skipping notification',
        'NotificationListener',
      );
      return;
    }

    const user = await this.userService.findOne(event.userId);

    if (!user) {
      this.logger.warn(
        `User ${event.userId} not found for OTP notification`,
        'NotificationListener',
      );
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

    try {
      await this.notificationService.trigger(NotificationType.OTP, {
        audience: 'DEFAULT',
        event,
        recipients: validRecipients,
        channels: [NotificationChannel.SMS],
      });
    } catch (error) {
      this.logger.error(
        `Failed to send OTP notification`,
        error instanceof Error ? error.stack : undefined,
        'NotificationListener',
        {
          userId: user.id,
          notificationType: NotificationType.OTP,
          audience: 'DEFAULT',
          channels: [NotificationChannel.SMS],
        },
      );
    }
  }
}
