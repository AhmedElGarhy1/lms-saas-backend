import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CenterActivityType } from '../enums/center-activity-type.enum';
import { CenterEvents } from '@/shared/events/center.events.enum';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
  DeleteCenterEvent,
  RestoreCenterEvent,
} from '../events/center.events';

/**
 * Domain Event Listener for Center Activity Logging
 *
 * Handles side effects (activity logging) for center domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class CenterActivityListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(CenterEvents.CREATED)
  async handleCenterCreated(event: CreateCenterEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_CREATED,
      {
        centerId: event.center.id,
        centerName: event.center.name,
        email: event.center.email,
        phone: event.center.phone,
        website: event.center.website,
        isActive: event.center.isActive,
      },
      event.actor,
    );
  }

  @OnEvent(CenterEvents.UPDATED)
  async handleCenterUpdated(event: UpdateCenterEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_UPDATED,
      {
        centerId: event.centerId,
        updatedFields: Object.keys(event.updates),
      },
      event.actor,
    );
  }

  @OnEvent(CenterEvents.DELETED)
  async handleCenterDeleted(event: DeleteCenterEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_DELETED,
      {
        centerId: event.centerId,
      },
      event.actor,
    );
  }

  @OnEvent(CenterEvents.RESTORED)
  async handleCenterRestored(event: RestoreCenterEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_RESTORED,
      {
        centerId: event.centerId,
      },
      event.actor,
    );
  }
}
