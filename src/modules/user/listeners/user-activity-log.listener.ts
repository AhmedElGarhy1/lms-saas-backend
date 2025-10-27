import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '../enums/user-activity-type.enum';
import {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserRestoredEvent,
  UserActivatedEvent,
  UserEvents,
} from '../events/user.events';

@Injectable()
export class UserActivityLogListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(UserEvents.CREATED)
  async handleUserCreated(event: UserCreatedEvent) {
    await this.activityLogService.log(
      UserActivityType.USER_CREATED,
      { userId: event.user.id, email: event.user.email },
      event.actor,
    );
  }

  @OnEvent(UserEvents.UPDATED)
  async handleUserUpdated(event: UserUpdatedEvent) {
    await this.activityLogService.log(
      UserActivityType.USER_UPDATED,
      {
        targetUserId: event.userId,
        updatedFields: Object.keys(event.updates),
        updatedBy: event.actor.id,
      },
      event.actor,
    );
  }

  @OnEvent(UserEvents.DELETED)
  async handleUserDeleted(event: UserDeletedEvent) {
    await this.activityLogService.log(
      UserActivityType.USER_DELETED,
      {
        targetUserId: event.userId,
        deletedBy: event.actor.id,
      },
      event.actor,
    );
  }

  @OnEvent(UserEvents.RESTORED)
  async handleUserRestored(event: UserRestoredEvent) {
    await this.activityLogService.log(
      UserActivityType.USER_RESTORED,
      {
        targetUserId: event.userId,
        restoredBy: event.actor.id,
      },
      event.actor,
    );
  }

  @OnEvent(UserEvents.ACTIVATED)
  async handleUserActivated(event: UserActivatedEvent) {
    await this.activityLogService.log(
      UserActivityType.USER_UPDATED,
      {
        targetUserId: event.userId,
        isActive: event.isActive,
        updatedBy: event.actor.id,
      },
      event.actor,
    );
  }
}
