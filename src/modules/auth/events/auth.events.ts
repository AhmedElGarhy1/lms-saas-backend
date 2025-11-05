import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';

export class UserLoggedInEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'auth.service', correlationId);
  }
}

export class UserLoggedOutEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor?: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'auth.service', correlationId);
  }
}

export class TokenRefreshedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor?: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'auth.service', correlationId);
  }
}

export class PasswordChangedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'auth.service', correlationId);
  }
}

export class EmailVerifiedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor?: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'auth.service', correlationId);
  }
}

export class PasswordResetRequestedEvent extends BaseEvent {
  constructor(
    public readonly email: string,
    public readonly userId?: string,
    public readonly name?: string,
    public readonly token?: string,
    public readonly resetUrl?: string,
    actor?: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'auth.service', correlationId);
  }
}

export class EmailVerificationRequestedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly token: string,
    public readonly verificationUrl: string,
    public readonly name?: string,
    actor?: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'auth.service', correlationId);
  }
}

export class OtpSentEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly otpCode: string,
    public readonly expiresIn: number, // in minutes
    public readonly email?: string,
    public readonly phone?: string,
    actor?: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'auth.service', correlationId);
  }
}

export class TwoFactorSetupEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'auth.service', correlationId);
  }
}

export class TwoFactorEnabledEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'auth.service', correlationId);
  }
}

export class TwoFactorDisabledEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    actor: ActorUser,
    correlationId?: string,
  ) {
    super(actor, 'auth.service', correlationId);
  }
}
