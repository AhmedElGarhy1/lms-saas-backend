import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { AuthActivityType } from '../enums/auth-activity-type.enum';
import {
  UserLoggedInEvent,
  PasswordChangedEvent,
  PasswordResetRequestedEvent,
  TwoFactorSetupEvent,
  TwoFactorEnabledEvent,
  TwoFactorDisabledEvent,
  AuthEvents,
} from '../events/auth.events';

@Injectable()
export class AuthActivityLogListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(AuthEvents.USER_LOGGED_IN)
  async handleUserLoggedIn(event: UserLoggedInEvent) {
    await this.activityLogService.log(
      AuthActivityType.USER_LOGIN,
      {
        userId: event.userId,
        email: event.email,
      },
      { id: event.userId } as any,
    );
  }

  @OnEvent(AuthEvents.PASSWORD_CHANGED)
  async handlePasswordChanged(event: PasswordChangedEvent) {
    await this.activityLogService.log(
      AuthActivityType.PASSWORD_CHANGED,
      {
        userId: event.userId,
      },
      event.actor,
    );
  }

  @OnEvent(AuthEvents.PASSWORD_RESET_REQUESTED)
  async handlePasswordResetRequested(event: PasswordResetRequestedEvent) {
    await this.activityLogService.log(
      AuthActivityType.PASSWORD_RESET_REQUESTED,
      {
        email: event.email,
      },
      { id: 'system' } as any,
    );
  }

  @OnEvent(AuthEvents.TWO_FA_SETUP)
  async handleTwoFactorSetup(event: TwoFactorSetupEvent) {
    await this.activityLogService.log(
      AuthActivityType.TWO_FA_SETUP,
      {
        userId: event.userId,
      },
      event.actor,
    );
  }

  @OnEvent(AuthEvents.TWO_FA_ENABLED)
  async handleTwoFactorEnabled(event: TwoFactorEnabledEvent) {
    await this.activityLogService.log(
      AuthActivityType.TWO_FA_ENABLED,
      {
        userId: event.userId,
      },
      event.actor,
    );
  }

  @OnEvent(AuthEvents.TWO_FA_DISABLED)
  async handleTwoFactorDisabled(event: TwoFactorDisabledEvent) {
    await this.activityLogService.log(
      AuthActivityType.TWO_FA_DISABLED,
      {
        userId: event.userId,
      },
      event.actor,
    );
  }
}
