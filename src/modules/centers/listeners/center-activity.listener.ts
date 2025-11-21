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
import { CentersRepository } from '../repositories/centers.repository';

/**
 * Domain Event Listener for Center Activity Logging
 *
 * Handles side effects (activity logging) for center domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class CenterActivityListener {
  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly centersRepository: CentersRepository,
  ) {}

  @OnEvent(CenterEvents.CREATED)
  async handleCenterCreated(event: CreateCenterEvent) {
    // ActivityLogService is fault-tolerant, no try-catch needed
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
      event.center.createdBy,
    );
  }

  @OnEvent(CenterEvents.UPDATED)
  async handleCenterUpdated(event: UpdateCenterEvent) {
    // Get center to find the creator (target user)
    const center = await this.centersRepository.findOne(event.centerId);
    const targetUserId = center?.createdBy ?? null;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      CenterActivityType.CENTER_UPDATED,
      {
        centerId: event.centerId,
        updatedFields: Object.keys(event.updates),
      },
      targetUserId,
    );
  }

  @OnEvent(CenterEvents.DELETED)
  async handleCenterDeleted(event: DeleteCenterEvent) {
    // Get center to find the creator (target user)
    // Note: findOne should work with soft-deleted entities via BaseRepository
    const center = await this.centersRepository.findOne(event.centerId);
    const targetUserId = center?.createdBy ?? null;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      CenterActivityType.CENTER_DELETED,
      {
        centerId: event.centerId,
      },
      targetUserId,
    );
  }

  @OnEvent(CenterEvents.RESTORED)
  async handleCenterRestored(event: RestoreCenterEvent) {
    // Get center to find the creator (target user)
    const center = await this.centersRepository.findOne(event.centerId);
    const targetUserId = center?.createdBy ?? null;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      CenterActivityType.CENTER_RESTORED,
      {
        centerId: event.centerId,
      },
      targetUserId,
    );
  }
}
