import { Class } from '../entities/class.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';

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
