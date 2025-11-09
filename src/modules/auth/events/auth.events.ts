import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';

export class UserLoggedInEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

export class UserLoggedOutEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

export class TokenRefreshedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

export class PasswordChangedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

export class EmailVerifiedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

export class PhoneVerifiedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly phone: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

export class PasswordResetRequestedEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly email: string,
    public readonly userId?: string,
    public readonly name?: string,
    public readonly token?: string,
    public readonly link?: string,
  ) {
    super(actor);
  }
}

export class EmailVerificationRequestedEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly userId: string,
    public readonly email: string,
    public readonly token: string,
    public readonly link: string,
    public readonly name?: string,
  ) {
    super(actor);
  }
}

export class OtpEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly userId: string,
    public readonly otpCode: string,
    public readonly expiresIn: number, // in minutes
    public readonly email?: string,
    public readonly phone?: string,
  ) {
    super(actor);
  }
}

export class TwoFactorSetupEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

export class TwoFactorEnabledEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

export class TwoFactorDisabledEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}
