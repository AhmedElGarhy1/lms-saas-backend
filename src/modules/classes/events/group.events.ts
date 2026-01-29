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
    public readonly classId: string,
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
