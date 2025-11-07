import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { LoggerService } from '@/shared/services/logger.service';
import { RecipientResolverService } from '../services/recipient-resolver.service';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
} from '@/modules/centers/events/center.events';
import {
  PasswordResetRequestedEvent,
  EmailVerificationRequestedEvent,
  OtpSentEvent,
} from '@/modules/auth/events/auth.events';
import { EventType } from '@/shared/events';
import { ValidateEvent } from '../types/event-notification-mapping.types';
import { NotificationEvent } from '../types/notification-event.types';
import { RecipientInfo } from '../types/recipient-info.interface';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { User } from '@/modules/user/entities/user.entity';
import { UserService } from '@/modules/user/services/user.service';

@Injectable()
export class NotificationListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService,
    private readonly recipientResolver: RecipientResolverService,
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
  ) {}

  /**
   * Unified notification handler with consistent error handling
   * Ensures all notifications go through the same pipeline
   * @param eventName - Event type identifier
   * @param event - Event object containing notification data
   * @param recipients - Array of recipients (required, never undefined)
   */
  private async handleNotification(
    eventName: EventType,
    event: NotificationEvent,
    recipients: RecipientInfo[],
  ): Promise<void> {
    // Validate recipients - phone and locale are always required
    const validRecipients = recipients.filter((r) => {
      if (!r.phone) {
        this.logger.warn(
          `Recipient ${r.userId} missing required phone, skipping`,
          'NotificationListener',
          { userId: r.userId, eventName },
        );
        return false;
      }
      if (!r.locale) {
        this.logger.warn(
          `Recipient ${r.userId} missing required locale, skipping`,
          'NotificationListener',
          { userId: r.userId, eventName },
        );
        return false;
      }
      return true;
    });

    if (validRecipients.length === 0) {
      this.logger.warn(
        `No valid recipients for event ${eventName}, skipping notification`,
        'NotificationListener',
        { eventName, originalCount: recipients.length },
      );
      return;
    }

    // Use validated recipients
    try {
      await this.notificationService.processEvent(
        eventName,
        event,
        validRecipients,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process notification for event ${eventName}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationListener',
        {
          eventName,
          error: errorMessage,
          recipientCount: validRecipients.length,
        },
      );
      // Don't throw - graceful degradation, allow other events to process
    }
  }

  @OnEvent(CenterEvents.CREATED)
  async handleCenterCreated(
    event: ValidateEvent<CreateCenterEvent, CenterEvents.CREATED>,
  ) {
    const { actor } = event;
    const recipient: RecipientInfo = {
      userId: actor.id,
      profileId: actor.userProfileId,
      profileType: actor.profileType,
      phone: actor.getPhone(),
      email: actor.email || null,
      locale: actor.userInfo.locale,
      centerId: actor.centerId || null,
    };
    await this.handleNotification(CenterEvents.CREATED, event, [recipient]);
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
      locale: actor.userInfo?.locale,
      centerId: actor.centerId || null,
    };
    await this.handleNotification(CenterEvents.UPDATED, event, [recipient]);
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

    await this.handleNotification(AuthEvents.PASSWORD_RESET_REQUESTED, event, [
      recipient,
    ]);
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

    await this.handleNotification(
      AuthEvents.EMAIL_VERIFICATION_REQUESTED,
      event,
      [recipient],
    );
  }

  @OnEvent(AuthEvents.OTP_SENT)
  async handleOtpSent(event: ValidateEvent<OtpSentEvent, AuthEvents.OTP_SENT>) {
    // Fetch user to get phone and locale
    if (!event.userId) {
      this.logger.warn(
        'OTP sent event missing userId, skipping notification',
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

    await this.handleNotification(AuthEvents.OTP_SENT, event, [recipient]);
  }
}
