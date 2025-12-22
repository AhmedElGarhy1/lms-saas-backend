import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ClassActivityType } from '../enums/class-activity-type.enum';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import {
  ClassCreatedEvent,
  ClassUpdatedEvent,
  ClassDeletedEvent,
  ClassRestoredEvent,
  ClassExportedEvent,
  ClassStatusChangedEvent,
} from '../events/class.events';

/**
 * Domain Event Listener for Class Activity Logging
 *
 * Handles side effects (activity logging) for class domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class ClassActivityListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(ClassEvents.CREATED)
  async handleClassCreated(event: ClassCreatedEvent) {
    const { classEntity, actor, centerId } = event;

    await this.activityLogService.log(
      ClassActivityType.CLASS_CREATED,
      {
        classId: classEntity.id,
        className: classEntity.name,
        levelId: classEntity.levelId,
        subjectId: classEntity.subjectId,
        teacherUserProfileId: classEntity.teacherUserProfileId,
        branchId: classEntity.branchId,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(ClassEvents.UPDATED)
  async handleClassUpdated(event: ClassUpdatedEvent) {
    const { classEntity, actor, centerId } = event;

    await this.activityLogService.log(
      ClassActivityType.CLASS_UPDATED,
      {
        classId: classEntity.id,
        className: classEntity.name,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(ClassEvents.DELETED)
  async handleClassDeleted(event: ClassDeletedEvent) {
    const { classId, actor, centerId } = event;

    await this.activityLogService.log(
      ClassActivityType.CLASS_DELETED,
      {
        classId: classId,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(ClassEvents.RESTORED)
  async handleClassRestored(event: ClassRestoredEvent) {
    const { classEntity, actor, centerId } = event;

    await this.activityLogService.log(
      ClassActivityType.CLASS_RESTORED,
      {
        classId: classEntity.id,
        className: classEntity.name,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(ClassEvents.EXPORTED)
  async handleClassExported(event: ClassExportedEvent) {
    const { format, filename, recordCount, filters, actor } = event;

    await this.activityLogService.log(
      ClassActivityType.CLASS_EXPORTED,
      {
        format: format,
        filename: filename,
        recordCount: recordCount,
        filters: filters,
      },
      actor.id,
    );
  }

  @OnEvent(ClassEvents.STATUS_CHANGED)
  async handleClassStatusChanged(event: ClassStatusChangedEvent) {
    const { classId, oldStatus, newStatus, reason, actor, centerId } = event;

    // Build description with status transition and optional reason
    const description = reason
      ? `Class status changed from ${oldStatus} to ${newStatus}. Reason: ${reason}`
      : `Class status changed from ${oldStatus} to ${newStatus}`;

    await this.activityLogService.log(
      ClassActivityType.CLASS_UPDATED, // Using CLASS_UPDATED as status change is a type of update
      {
        classId: classId,
        centerId: centerId,
        oldStatus: oldStatus,
        newStatus: newStatus,
        reason: reason,
        description: description,
      },
      actor.id,
    );
  }
}
