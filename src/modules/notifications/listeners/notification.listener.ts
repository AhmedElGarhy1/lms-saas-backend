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
  CreateUserEvent,
  UpdateUserEvent,
  DeleteUserEvent,
  RestoreUserEvent,
  ActivateUserEvent,
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

@Injectable()
export class NotificationListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService,
    private readonly recipientResolver: RecipientResolverService,
  ) {}

  /**
   * Enqueue notification job
   * Wrapped in try/catch to prevent unhandled exceptions from stopping event processing
   */
  private async enqueueNotification(
    eventName: EventType | string,
    event: any,
  ): Promise<void> {
    try {
      await this.notificationService.processEvent(eventName, event);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Note: correlationId will be extracted/generated in processEvent()
      this.logger.error(
        `Failed to process notification for event ${eventName}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationListener',
        {
          eventName,
          error: errorMessage,
        },
      );
      // Don't throw - graceful degradation, allow other events to process
    }
  }

  @OnEvent(UserEvents.CREATE, { async: true })
  async handleUserCreated(event: CreateUserEvent) {
    await this.enqueueNotification(UserEvents.CREATE, event);
  }

  @OnEvent(UserEvents.UPDATE, { async: true })
  async handleUserUpdated(event: UpdateUserEvent) {
    await this.enqueueNotification(UserEvents.UPDATE, event);
  }

  @OnEvent(UserEvents.DELETE, { async: true })
  async handleUserDeleted(event: DeleteUserEvent) {
    await this.enqueueNotification(UserEvents.DELETE, event);
  }

  @OnEvent(UserEvents.RESTORE, { async: true })
  async handleUserRestored(event: RestoreUserEvent) {
    await this.enqueueNotification(UserEvents.RESTORE, event);
  }

  @OnEvent(UserEvents.ACTIVATE, { async: true })
  async handleUserActivated(event: ActivateUserEvent) {
    await this.enqueueNotification(UserEvents.ACTIVATE, event);
  }

  @OnEvent(CenterEvents.CREATE, { async: true })
  async handleCenterCreated(event: CreateCenterEvent) {
    await this.enqueueNotification(CenterEvents.CREATE, event);
  }

  @OnEvent(CenterEvents.UPDATE, { async: true })
  async handleCenterUpdated(event: UpdateCenterEvent) {
    try {
      // Resolve recipients: ADMIN and STAFF profiles for the center
      const recipients = await this.recipientResolver.getCenterMembers(
        event.centerId,
        {
          profileTypes: [ProfileType.ADMIN, ProfileType.STAFF],
          skipSelfUserId: event.actor.id, // Exclude actor
        },
      );

      // Process event with recipients
      await this.notificationService.processEvent(
        CenterEvents.UPDATE,
        event,
        recipients,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process center update notification: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationListener',
        {
          eventName: CenterEvents.UPDATE,
          centerId: event.centerId,
          error: errorMessage,
        },
      );
      // Fallback to single-recipient notification (actor only)
      await this.enqueueNotification(CenterEvents.UPDATE, event);
    }
  }

  @OnEvent(CenterEvents.DELETE, { async: true })
  async handleCenterDeleted(event: DeleteCenterEvent) {
    try {
      // Resolve recipients: ADMIN and STAFF profiles for the center
      const recipients = await this.recipientResolver.getCenterMembers(
        event.centerId,
        {
          profileTypes: [ProfileType.ADMIN, ProfileType.STAFF],
          skipSelfUserId: event.actor.id, // Exclude actor
        },
      );

      // Process event with recipients
      await this.notificationService.processEvent(
        CenterEvents.DELETE,
        event,
        recipients,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process center delete notification: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationListener',
        {
          eventName: CenterEvents.DELETE,
          centerId: event.centerId,
          error: errorMessage,
        },
      );
      // Fallback to single-recipient notification (actor only)
      await this.enqueueNotification(CenterEvents.DELETE, event);
    }
  }

  @OnEvent(CenterEvents.RESTORE, { async: true })
  async handleCenterRestored(event: RestoreCenterEvent) {
    try {
      // Resolve recipients: ADMIN and STAFF profiles for the center
      const recipients = await this.recipientResolver.getCenterMembers(
        event.centerId,
        {
          profileTypes: [ProfileType.ADMIN, ProfileType.STAFF],
          skipSelfUserId: event.actor.id, // Exclude actor
        },
      );

      // Process event with recipients
      await this.notificationService.processEvent(
        CenterEvents.RESTORE,
        event,
        recipients,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process center restore notification: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationListener',
        {
          eventName: CenterEvents.RESTORE,
          centerId: event.centerId,
          error: errorMessage,
        },
      );
      // Fallback to single-recipient notification (actor only)
      await this.enqueueNotification(CenterEvents.RESTORE, event);
    }
  }

  @OnEvent(BranchEvents.CREATED, { async: true })
  async handleBranchCreated(event: BranchCreatedEvent) {
    await this.enqueueNotification(BranchEvents.CREATED, event);
  }

  @OnEvent(BranchEvents.UPDATED, { async: true })
  async handleBranchUpdated(event: BranchUpdatedEvent) {
    await this.enqueueNotification(BranchEvents.UPDATED, event);
  }

  @OnEvent(BranchEvents.DELETED, { async: true })
  async handleBranchDeleted(event: BranchDeletedEvent) {
    await this.enqueueNotification(BranchEvents.DELETED, event);
  }

  @OnEvent(BranchEvents.RESTORED, { async: true })
  async handleBranchRestored(event: BranchRestoredEvent) {
    await this.enqueueNotification(BranchEvents.RESTORED, event);
  }

  @OnEvent(AuthEvents.PASSWORD_RESET_REQUESTED, { async: true })
  async handlePasswordResetRequested(event: PasswordResetRequestedEvent) {
    await this.enqueueNotification(AuthEvents.PASSWORD_RESET_REQUESTED, event);
  }

  @OnEvent(AuthEvents.EMAIL_VERIFICATION_REQUESTED, { async: true })
  async handleEmailVerificationRequested(
    event: EmailVerificationRequestedEvent,
  ) {
    await this.enqueueNotification(
      AuthEvents.EMAIL_VERIFICATION_REQUESTED,
      event,
    );
  }

  @OnEvent(AuthEvents.OTP_SENT, { async: true })
  async handleOtpSent(event: OtpSentEvent) {
    await this.enqueueNotification(AuthEvents.OTP_SENT, event);
  }
}
