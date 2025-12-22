import { Class } from '../entities/class.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';
import { ClassStatus } from '../enums/class-status.enum';

export class ClassCreatedEvent {
  constructor(
    public readonly classEntity: Class,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class ClassUpdatedEvent {
  constructor(
    public readonly classEntity: Class,
    public readonly actor: ActorUser,
    public readonly centerId: string,
    public readonly changedFields?: string[], // ['duration', 'name', etc.]
  ) {}
}

export class ClassDeletedEvent {
  constructor(
    public readonly classId: string,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class ClassRestoredEvent {
  constructor(
    public readonly classEntity: Class,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that class data was exported.
 */
export class ClassExportedEvent extends BaseEvent {
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

/**
 * Event representing a class status change
 */
export class ClassStatusChangedEvent {
  constructor(
    public readonly classId: string,
    public readonly oldStatus: ClassStatus,
    public readonly newStatus: ClassStatus,
    public readonly reason: string | undefined,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}
