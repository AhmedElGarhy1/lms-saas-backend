import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';
import { SystemEvent } from '@/shared/common/base/system-event';

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

export class UserLoginFailedEvent extends SystemEvent {
  constructor(
    public readonly emailOrPhone: string,
    public readonly userId?: string,
    public readonly reason?: string,
  ) {
    super();
  }
}

export class PasswordResetRequestedEvent extends SystemEvent {
  constructor(
    public readonly email: string,
    public readonly userId?: string,
    public readonly name?: string,
    public readonly token?: string,
    public readonly link?: string,
  ) {
    super();
  }
}

export class EmailVerificationRequestedEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly token: string,
    public readonly link: string,
  ) {
    super(actor);
  }
}

export class OtpEvent extends SystemEvent {
  constructor(
    public readonly userId: string,
    public readonly otpCode: string,
    public readonly expiresIn: number, // in minutes
    public readonly email?: string,
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

/**
 * Event to request email verification for a user
 * Can be emitted from any module to trigger email verification
 * Note: This is different from EmailVerificationRequestedEvent (which is emitted AFTER token creation)
 */
export class RequestEmailVerificationEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly userId: string,
    public readonly email: string,
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

export class AccountLockedEvent extends SystemEvent {
  constructor(
    public readonly userId: string,
    public readonly phone: string,
    public readonly lockoutDurationMinutes: number,
  ) {
    super();
  }
}
