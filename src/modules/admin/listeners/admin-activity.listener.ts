import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { AdminActivityType } from '../enums/admin-activity-type.enum';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { CreateAdminEvent } from '../events/admin.events';

/**
 * Domain Event Listener for Admin Activity Logging
 *
 * Handles side effects (activity logging) for admin domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class AdminActivityListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(AdminEvents.CREATE)
  async handleAdminCreated(event: CreateAdminEvent) {
    const { dto, actor, admin } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      AdminActivityType.ADMIN_CREATED,
      {
        adminId: admin.id,
        email: dto.email,
        phone: dto.phone,
        roleId: dto.roleId,
      },
      actor,
    );
  }
}
