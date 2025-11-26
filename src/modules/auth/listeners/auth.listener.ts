import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { AuthActivityType } from '../enums/auth-activity-type.enum';
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
    private readonly activityLogService: ActivityLogService,
  ) {}

  @OnEvent(AuthEvents.USER_LOGGED_IN)
  async handleUserLoggedIn(event: UserLoggedInEvent) {
    const { userId, actor } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      AuthActivityType.USER_LOGIN,
      {
        userId,
        phone: actor.phone,
      },
      userId,
    );
  }

  @OnEvent(AuthEvents.PASSWORD_CHANGED)
  async handlePasswordChanged(event: PasswordChangedEvent) {
    const { userId, actor } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      AuthActivityType.PASSWORD_CHANGED,
      {
        userId,
        phone: actor.phone,
      },
      userId,
    );
  }

  @OnEvent(AuthEvents.PHONE_VERIFIED)
  async handlePhoneVerified(event: PhoneVerifiedEvent) {
    const { userId } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    // Phone will be fetched by ActivityLogService if needed
    await this.activityLogService.log(
      AuthActivityType.PHONE_VERIFIED,
      {
        userId,
      },
      userId,
    );
  }

  @OnEvent(AuthEvents.TWO_FA_ENABLED)
  async handleTwoFactorEnabled(event: TwoFactorEnabledEvent) {
    const { userId, actor } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      AuthActivityType.TWO_FA_ENABLED,
      {
        userId,
        phone: actor.phone,
      },
      userId,
    );
  }

  @OnEvent(AuthEvents.TWO_FA_DISABLED)
  async handleTwoFactorDisabled(event: TwoFactorDisabledEvent) {
    const { userId, actor } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      AuthActivityType.TWO_FA_DISABLED,
      {
        userId,
        phone: actor.phone,
      },
      userId,
    );
  }

  @OnEvent(AuthEvents.USER_LOGIN_FAILED)
  async handleUserLoginFailed(event: UserLoginFailedEvent) {
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      AuthActivityType.USER_LOGIN_FAILED,
      {
        phone: event.phone,
        reason: event.reason,
      },
      event.userId ?? null,
    );
  }

  @OnEvent(AuthEvents.PASSWORD_RESET_REQUESTED)
  async handlePasswordResetRequested(event: PasswordResetRequestedEvent) {
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      AuthActivityType.PASSWORD_RESET_REQUESTED,
      {
        phone: event.phone,
        name: event.name,
      },
      event.userId ?? null,
    );
  }
}
