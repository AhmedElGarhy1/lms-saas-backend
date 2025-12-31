import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import {
  UserLoggedInEvent,
  PasswordChangedEvent,
  PhoneVerifiedEvent,
  TwoFactorEnabledEvent,
  TwoFactorDisabledEvent,
  UserLoginFailedEvent,
  PasswordResetRequestedEvent,
} from '../events/auth.events';

@Injectable()
export class AuthListener {
  private readonly logger: Logger = new Logger(AuthListener.name);

  constructor(
    private readonly moduleRef: ModuleRef,
  ) {}

  @OnEvent(AuthEvents.USER_LOGGED_IN)
  async handleUserLoggedIn(event: UserLoggedInEvent) {
    // Activity logging removed
  }

  @OnEvent(AuthEvents.PASSWORD_CHANGED)
  async handlePasswordChanged(event: PasswordChangedEvent) {
    // Activity logging removed
  }

  @OnEvent(AuthEvents.PHONE_VERIFIED)
  async handlePhoneVerified(event: PhoneVerifiedEvent) {
    // Activity logging removed
  }

  @OnEvent(AuthEvents.TWO_FA_ENABLED)
  async handleTwoFactorEnabled(event: TwoFactorEnabledEvent) {
    // Activity logging removed
  }

  @OnEvent(AuthEvents.TWO_FA_DISABLED)
  async handleTwoFactorDisabled(event: TwoFactorDisabledEvent) {
    // Activity logging removed
  }

  @OnEvent(AuthEvents.USER_LOGIN_FAILED)
  async handleUserLoginFailed(event: UserLoginFailedEvent) {
    // Activity logging removed
  }

  @OnEvent(AuthEvents.PASSWORD_RESET_REQUESTED)
  async handlePasswordResetRequested(event: PasswordResetRequestedEvent) {
    // Activity logging removed
  }
}
