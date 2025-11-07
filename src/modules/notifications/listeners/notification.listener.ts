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
import { UserRepository } from '@/modules/user/repositories/user.repository';

@Injectable()
export class NotificationListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService,
    private readonly recipientResolver: RecipientResolverService,
    private readonly userProfileService: UserProfileService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Unified notification handler with consistent error handling
   * Ensures all notifications go through the same pipeline
   * @param eventName - Event type identifier
   * @param event - Event object containing notification data
   * @param recipients - Array of recipients (required, never undefined)
   * @param requirePhone - Whether phone is required (default: true). Set to false for EMAIL-only events
   */
  private async handleNotification(
    eventName: EventType,
    event: NotificationEvent,
    recipients: RecipientInfo[],
    requirePhone: boolean = true,
  ): Promise<void> {
    // Validate recipients based on requirements
    const validRecipients = recipients.filter((r) => {
      if (requirePhone && !r.phone) {
        this.logger.warn(
          `Recipient ${r.userId} missing required phone, skipping`,
          'NotificationListener',
          { userId: r.userId, eventName },
        );
        return false;
      }
      // For email-only events, ensure email exists
      if (!requirePhone && !r.email) {
        this.logger.warn(
          `Recipient ${r.userId} missing required email, skipping`,
          'NotificationListener',
          { userId: r.userId, eventName },
        );
        return false;
      }
      // Ensure at least one contact method exists
      if (!r.phone && !r.email) {
        this.logger.warn(
          `Recipient ${r.userId} missing both phone and email, skipping`,
          'NotificationListener',
          { userId: r.userId, eventName },
        );
        return false;
      }
      return true;
    });

    if (validRecipients.length === 0) {
      const requiredField = requirePhone ? 'phone' : 'email';
      this.logger.warn(
        `No valid recipients (with ${requiredField}) for event ${eventName}, skipping notification`,
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
    // Extract recipient info from event
    // Password reset event has email field which can be email or phone depending on channel
    const isEmail = event.email?.includes('@') || false;
    const recipient: RecipientInfo = {
      userId: event.userId || '',
      profileId: null,
      profileType: null,
      phone: isEmail ? null : event.email || null,
      email: isEmail ? event.email || null : null,
    };

    // Password reset can be via EMAIL, SMS, or WHATSAPP - don't require phone
    // The notification service will route based on channel configuration
    await this.handleNotification(
      AuthEvents.PASSWORD_RESET_REQUESTED,
      event,
      [recipient],
      false, // Don't require phone for password reset
    );
  }

  @OnEvent(AuthEvents.EMAIL_VERIFICATION_REQUESTED)
  async handleEmailVerificationRequested(
    event: ValidateEvent<
      EmailVerificationRequestedEvent,
      AuthEvents.EMAIL_VERIFICATION_REQUESTED
    >,
  ) {
    // Extract recipient info from event
    const recipient: RecipientInfo = {
      userId: event.userId,
      profileId: null,
      profileType: null,
      phone: null,
      email: event.email,
    };

    // Email verification only uses EMAIL channel - don't require phone
    await this.handleNotification(
      AuthEvents.EMAIL_VERIFICATION_REQUESTED,
      event,
      [recipient],
      false, // Don't require phone for email verification
    );
  }

  @OnEvent(AuthEvents.OTP_SENT)
  async handleOtpSent(event: ValidateEvent<OtpSentEvent, AuthEvents.OTP_SENT>) {
    // Extract recipient info from event
    const recipient: RecipientInfo = {
      userId: event.userId,
      profileId: null,
      profileType: null,
      phone: event.phone || null,
      email: event.email || null,
    };

    // OTP can be sent via SMS, EMAIL, or WHATSAPP
    // For SMS/WhatsApp, phone is required; for EMAIL, email is required
    // The notification service will route based on channel configuration
    const requirePhone = !!(event.phone && !event.email);
    await this.handleNotification(
      AuthEvents.OTP_SENT,
      event,
      [recipient],
      requirePhone,
    );
  }
}
