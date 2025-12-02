import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '../enums/user-activity-type.enum';
import { UserEvents } from '@/shared/events/user.events.enum';
import {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserRestoredEvent,
  UserActivatedEvent,
  UserImportedEvent,
} from '../events/user.events';

/**
 * Domain Event Listener for User Activity Logging
 *
 * Handles side effects (activity logging) for user domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class UserActivityListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(UserEvents.CREATED)
  async handleUserCreated(event: UserCreatedEvent) {
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      UserActivityType.USER_CREATED,
      {
        targetUserId: event.user.id,
        phone: event.user.phone,
        name: event.user.name,
        profileType: event.profile.profileType,
        createdBy: event.actor?.id,
      },
      event.user.id,
    );
  }

  @OnEvent(UserEvents.UPDATED)
  async handleUserUpdated(event: UserUpdatedEvent) {
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(UserActivityType.USER_UPDATED, {
      targetUserId: event.user.id,
      updatedFields: event.updatedFields,
    });
  }

  @OnEvent(UserEvents.DELETED)
  async handleUserDeleted(event: UserDeletedEvent) {
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      UserActivityType.USER_DELETED,
      {
        targetUserId: event.userId,
      },
      event.userId,
    );
  }

  @OnEvent(UserEvents.RESTORED)
  async handleUserRestored(event: UserRestoredEvent) {
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      UserActivityType.USER_RESTORED,
      {
        targetUserId: event.userId,
      },
      event.userId,
    );
  }

  @OnEvent(UserEvents.ACTIVATED)
  async handleUserActivated(event: UserActivatedEvent) {
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      event.isActive
        ? UserActivityType.USER_ACTIVATED
        : UserActivityType.USER_DEACTIVATED,
      {
        targetUserId: event.userId,
        isActive: event.isActive,
      },
      event.userId,
    );
  }

  @OnEvent(UserEvents.IMPORTED)
  async handleUserImported(event: UserImportedEvent) {
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      UserActivityType.USER_IMPORTED,
      {
        profileType: event.profileType,
        centerId: event.centerId,
        importedBy: event.actor?.id,
      },
      event.user.id,
    );
  }
}
