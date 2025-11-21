import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { StaffActivityType } from '../enums/staff-activity-type.enum';
import { StaffEvents } from '@/shared/events/staff.events.enum';
import { StaffCreatedEvent } from '../events/staff.events';

/**
 * Domain Event Listener for Staff Activity Logging
 *
 * Handles side effects (activity logging) for staff domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class StaffActivityListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(StaffEvents.CREATED)
  async handleStaffCreated(event: StaffCreatedEvent) {
    const { user, actor, staff, centerId, roleId } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      StaffActivityType.STAFF_CREATED,
      {
        staffId: staff.id,
        email: user.email,
        phone: user.phone,
        centerId: centerId,
        roleId: roleId,
      },
      user.id,
    );
  }
}
