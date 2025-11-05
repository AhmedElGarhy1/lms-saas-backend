import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a user was created.
 */
export class UserCreatedEvent extends BaseEvent {
  constructor(
    public readonly user: User,
    public readonly profile: UserProfile,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'user.command.handler', correlationId);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a user was updated.
 */
export class UserUpdatedEvent extends BaseEvent {
  constructor(
    public readonly user: User,
    public readonly updatedFields: string[],
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'user.command.handler', correlationId);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a user was deleted.
 */
export class UserDeletedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'user.command.handler', correlationId);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a user was restored.
 */
export class UserRestoredEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'user.command.handler', correlationId);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that a user was activated or deactivated.
 */
export class UserActivatedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly isActive: boolean,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'user.command.handler', correlationId);
  }
}
