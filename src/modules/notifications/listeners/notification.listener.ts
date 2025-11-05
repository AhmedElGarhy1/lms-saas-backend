import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { LoggerService } from '@/shared/services/logger.service';
import { RecipientResolverService } from '../services/recipient-resolver.service';
import { UserEvents } from '@/shared/events/user.events.enum';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { BranchEvents } from '@/shared/events/branch.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserRestoredEvent,
  UserActivatedEvent,
} from '@/modules/user/events/user.events';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
  DeleteCenterEvent,
  RestoreCenterEvent,
} from '@/modules/centers/events/center.events';
import {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchDeletedEvent,
  BranchRestoredEvent,
} from '@/modules/centers/events/branch.events';
import {
  PasswordResetRequestedEvent,
  EmailVerificationRequestedEvent,
  OtpSentEvent,
} from '@/modules/auth/events/auth.events';
import { EventType } from '@/shared/events';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
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
   */
  private async handleNotification(
    eventName: EventType,
    event: NotificationEvent,
    recipients: RecipientInfo[],
  ): Promise<void> {
    // Validate recipients have phone (required)
    const validRecipients = recipients.filter((r) => {
      if (!r.phone) {
        this.logger.warn(
          `Recipient ${r.userId} missing required phone, skipping`,
          'NotificationListener',
          { userId: r.userId, eventName },
        );
        return false;
      }
      return true;
    });

    if (validRecipients.length === 0) {
      this.logger.warn(
        `No valid recipients (with phone) for event ${eventName}, skipping notification`,
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
  async handleCenterCreated(event: CreateCenterEvent) {
    const { actor } = event;
    const recipient: RecipientInfo = {
      userId: actor.id,
      profileId: actor.userProfileId,
      profileType: actor.profileType,
      phone: actor.phone,
      email: actor.email || null,
    };
    await this.handleNotification(CenterEvents.CREATED, event, [recipient]);
  }

  @OnEvent(CenterEvents.UPDATED)
  async handleCenterUpdated(event: UpdateCenterEvent) {
    const { actor } = event;
    const recipient: RecipientInfo = {
      userId: actor.id,
      profileId: actor.userProfileId,
      profileType: actor.profileType,
      phone: actor.phone,
      email: actor.email || null,
    };
    await this.handleNotification(CenterEvents.UPDATED, event, [recipient]);
  }
}
