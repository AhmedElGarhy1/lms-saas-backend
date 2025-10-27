import { ActorUser } from '@/shared/common/types/actor-user.type';

export enum AuthEvents {
  USER_LOGGED_IN = 'user.logged.in',
  USER_LOGGED_OUT = 'user.logged.out',
  PASSWORD_CHANGED = 'password.changed',
  EMAIL_VERIFIED = 'email.verified',
  PASSWORD_RESET_REQUESTED = 'password.reset.requested',
  TWO_FA_SETUP = 'two.fa.setup',
  TWO_FA_ENABLED = 'two.fa.enabled',
  TWO_FA_DISABLED = 'two.fa.disabled',
}

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
  constructor(public readonly email: string) {}
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
