import { ActorUser } from '@/shared/common/types/actor-user.type';

export class UserLoggedInEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly actor: ActorUser,
  ) {}
}

export class UserLoggedOutEvent {
  constructor(public readonly userId: string) {}
}

export class PasswordChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class EmailVerifiedEvent {
  constructor(public readonly userId: string) {}
}

export class PasswordResetRequestedEvent {
  constructor(
    public readonly email: string,
    public readonly userId?: string,
    public readonly name?: string,
    public readonly token?: string,
    public readonly resetUrl?: string,
  ) {}
}

export class EmailVerificationRequestedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly token: string,
    public readonly verificationUrl: string,
    public readonly name?: string,
  ) {}
}

export class OtpSentEvent {
  constructor(
    public readonly userId: string,
    public readonly otpCode: string,
    public readonly expiresIn: number, // in minutes
    public readonly email?: string,
    public readonly phone?: string,
  ) {}
}

export class TwoFactorSetupEvent {
  constructor(
    public readonly userId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class TwoFactorEnabledEvent {
  constructor(
    public readonly userId: string,
    public readonly actor: ActorUser,
  ) {}
}

export class TwoFactorDisabledEvent {
  constructor(
    public readonly userId: string,
    public readonly actor: ActorUser,
  ) {}
}
