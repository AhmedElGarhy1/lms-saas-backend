import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';
import { SystemEvent } from '@/shared/common/base/system-event';

export class UserLoggedInEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly phone: string,
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

export class PhoneVerifiedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly phone: string,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

export class UserLoginFailedEvent extends SystemEvent {
  constructor(
    public readonly phone: string,
    public readonly userId?: string,
    public readonly reason?: string,
  ) {
    super();
  }
}

export class PasswordResetRequestedEvent extends SystemEvent {
  constructor(
    public readonly phone: string,
    public readonly userId?: string,
    public readonly name?: string,
    public readonly token?: string,
    public readonly link?: string,
  ) {
    super();
  }
}

export class OtpEvent extends SystemEvent {
  constructor(
    public readonly userId: string,
    public readonly otpCode: string,
    public readonly expiresIn: number, // in minutes
    public readonly phone?: string,
  ) {
    super();
  }
}

/**
 * Event to request phone verification for a user
 * Can be emitted from any module to trigger phone verification
 */
export class RequestPhoneVerificationEvent extends SystemEvent {
  constructor(
    public readonly userId: string,
    public readonly phone: string,
  ) {
    super();
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
