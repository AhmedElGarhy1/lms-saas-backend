import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

/**
 * User profile was activated.
 */
export class UserProfileActivatedEvent extends BaseEvent {
  constructor(
    public readonly userProfileId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

/**
 * User profile was deactivated.
 */
export class UserProfileDeactivatedEvent extends BaseEvent {
  constructor(
    public readonly userProfileId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

/**
 * User profile was soft-deleted.
 */
export class UserProfileDeletedEvent extends BaseEvent {
  constructor(
    public readonly userProfileId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

/**
 * User profile was restored from soft-delete.
 */
export class UserProfileRestoredEvent extends BaseEvent {
  constructor(
    public readonly userProfileId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

/**
 * User profile was created.
 */
export class UserProfileCreatedEvent extends BaseEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly profileType: ProfileType,
    public readonly centerId: string | undefined,
    actor: ActorUser,
  ) {
    super(actor);
  }
}
