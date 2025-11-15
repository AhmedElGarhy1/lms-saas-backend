import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { AdminActivityType } from '../enums/admin-activity-type.enum';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { AdminCreatedEvent } from '../events/admin.events';

/**
 * Domain Event Listener for Admin Activity Logging
 *
 * Handles side effects (activity logging) for admin domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class AdminActivityListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(AdminEvents.CREATED)
  async handleAdminCreated(event: AdminCreatedEvent) {
    const { user, actor, admin, roleId } = event;

    await this.activityLogService.log(
      AdminActivityType.ADMIN_CREATED,
      {
        adminId: admin.id,
        email: user.email,
        phone: user.phone,
        roleId: roleId,
      },
      actor,
    );
  }
}
