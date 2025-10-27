import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import { StaffCreatedEvent, StaffEvents } from '../events/staff.events';

@Injectable()
export class ActivityLogListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(StaffEvents.CREATED)
  async handleStaffCreated(event: StaffCreatedEvent) {
    await this.activityLogService.log(
      UserActivityType.USER_CREATED,
      {
        targetUserId: event.user.id,
        email: event.user.email,
        name: event.user.name,
        profileType: 'STAFF',
        createdBy: event.actor.id,
      },
      event.actor,
    );
  }
}
