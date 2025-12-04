import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { GroupActivityType } from '../enums/group-activity-type.enum';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import {
  GroupCreatedEvent,
  GroupUpdatedEvent,
  GroupDeletedEvent,
  GroupRestoredEvent,
  GroupExportedEvent,
} from '../events/group.events';

/**
 * Domain Event Listener for Group Activity Logging
 *
 * Handles side effects (activity logging) for group domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class GroupActivityListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(GroupEvents.CREATED)
  async handleGroupCreated(event: GroupCreatedEvent) {
    const { group, classEntity, actor, centerId } = event;

    await this.activityLogService.log(
      GroupActivityType.GROUP_CREATED,
      {
        groupId: group.id,
        groupName: group.name,
        classId: group.classId,
        className: classEntity.name,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(GroupEvents.UPDATED)
  async handleGroupUpdated(event: GroupUpdatedEvent) {
    const { group, actor, centerId } = event;

    await this.activityLogService.log(
      GroupActivityType.GROUP_UPDATED,
      {
        groupId: group.id,
        groupName: group.name,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(GroupEvents.DELETED)
  async handleGroupDeleted(event: GroupDeletedEvent) {
    const { groupId, actor, centerId } = event;

    await this.activityLogService.log(
      GroupActivityType.GROUP_DELETED,
      {
        groupId: groupId,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(GroupEvents.RESTORED)
  async handleGroupRestored(event: GroupRestoredEvent) {
    const { group, actor, centerId } = event;

    await this.activityLogService.log(
      GroupActivityType.GROUP_RESTORED,
      {
        groupId: group.id,
        groupName: group.name,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(GroupEvents.EXPORTED)
  async handleGroupExported(event: GroupExportedEvent) {
    const { format, filename, recordCount, filters, actor } = event;

    await this.activityLogService.log(
      GroupActivityType.GROUP_EXPORTED,
      {
        format: format,
        filename: filename,
        recordCount: recordCount,
        filters: filters,
      },
      actor.id,
    );
  }
}
