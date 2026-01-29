import { Session } from '../entities/session.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { SessionStatus } from '../enums/session-status.enum';

export class SessionCreatedEvent {
  constructor(
    public readonly session: Session,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class SessionUpdatedEvent {
  constructor(
    public readonly session: Session,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class SessionDeletedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly groupId: string,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class SessionCanceledEvent {
  constructor(
    public readonly session: Session,
    public readonly actor: ActorUser,
    public readonly centerId: string,
    // TODO: Add refund logic integration in the future
  ) {}
}

export class SessionFinishedEvent {
  constructor(
    public readonly session: Session,
    public readonly actor: ActorUser,
  ) {}

  get centerId(): string {
    return this.actor.centerId!;
  }
}

export class SessionCheckedInEvent {
  constructor(
    public readonly session: Session,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class SessionsBulkDeletedEvent {
  constructor(
    public readonly sessionIds: string[],
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class SessionConflictDetectedEvent {
  constructor(
    public readonly groupId: string,
    public readonly scheduleItemId: string,
    public readonly proposedStartTime: Date,
    public readonly proposedEndTime: Date,
    public readonly conflictType: 'TEACHER' | 'GROUP',
    public readonly conflictingSessionId: string,
    public readonly conflictingSessionStartTime: Date,
    public readonly conflictingSessionEndTime: Date,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}
