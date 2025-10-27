import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import { AdminCreatedEvent, AdminEvents } from '../events/admin.events';

@Injectable()
export class AdminActivityLogListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(AdminEvents.CREATED)
  async handleAdminCreated(event: AdminCreatedEvent) {
    await this.activityLogService.log(
      UserActivityType.USER_CREATED,
      {
        targetUserId: event.user.id,
        email: event.user.email,
        name: event.user.name,
        profileType: 'ADMIN',
        createdBy: event.actor.id,
      },
      event.actor,
    );
  }
}
