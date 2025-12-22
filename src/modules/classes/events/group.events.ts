import { Group } from '../entities/group.entity';
import { Class } from '../entities/class.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';
import { ScheduleItem } from '../entities/schedule-item.entity';

export class GroupCreatedEvent {
  constructor(
    public readonly group: Group,
    public readonly classEntity: Class,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class GroupUpdatedEvent {
  constructor(
    public readonly group: Group,
    public readonly actor: ActorUser,
    public readonly centerId: string,
    public readonly changedFields?: string[], // ['name', 'scheduleItems']
  ) {}
}

export class GroupDeletedEvent {
  constructor(
    public readonly groupId: string,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class GroupRestoredEvent {
  constructor(
    public readonly group: Group,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that group data was exported.
 */
export class GroupExportedEvent extends BaseEvent {
  constructor(
    public readonly format: string,
    public readonly filename: string,
    public readonly recordCount: number,
    public readonly filters: Record<string, any>,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

export class ScheduleItemsUpdatedEvent {
  constructor(
    public readonly groupId: string,
    public readonly oldScheduleItems: ScheduleItem[],
    public readonly newScheduleItems: ScheduleItem[],
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}
