import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { AuthActivityType } from '../enums/auth-activity-type.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { UserLoggedOutEvent, TokenRefreshedEvent } from '../events/auth.events';
import { UserService } from '@/modules/user/services/user.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

@Injectable()
export class AuthListener {
  private readonly logger: Logger;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly activityLogService: ActivityLogService,
    private readonly userService: UserService,
  ) {
    // Use class name as context
    const context = this.constructor.name;
    this.logger = new Logger(context);
  }

  @OnEvent(AuthEvents.USER_LOGGED_OUT)
  async handleUserLoggedOut(event: UserLoggedOutEvent) {
    const { userId } = event;

    // Use actor from event if available, otherwise build from user
    let actor = event.actor;
    if (!actor) {
      try {
        const user = await this.userService.findOne(userId);
        if (!user) {
          return;
        }
        actor = {
          id: user.id,
          userProfileId: user.id, // Temporary - will be updated when we have profile info
          profileType: ProfileType.STUDENT, // Temporary default
          centerId: undefined,
        } as ActorUser;
      } catch (error) {
        this.logger.error(
          `Failed to handle ${AuthEvents.USER_LOGGED_OUT} event - userId: ${userId}`,
          error instanceof Error ? error.stack : String(error),
          {
            eventType: AuthEvents.USER_LOGGED_OUT,
            userId,
          },
        );
        return;
      }
    }

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      AuthActivityType.USER_LOGOUT,
      {
        userId,
        email:
          'email' in actor && typeof actor.email === 'string'
            ? actor.email
            : userId,
      },
      actor,
    );
  }

  @OnEvent(AuthEvents.TOKEN_REFRESHED)
  async handleTokenRefreshed(event: TokenRefreshedEvent) {
    const { userId } = event;

    // Use actor from event if available, otherwise build from user
    let actor = event.actor;
    if (!actor) {
      try {
        const user = await this.userService.findOne(userId);
        if (!user) {
          return;
        }
        actor = {
          id: user.id,
          userProfileId: user.id, // Temporary - will be updated when we have profile info
          profileType: ProfileType.STUDENT, // Temporary default
          centerId: undefined,
        } as ActorUser;
      } catch (error) {
        this.logger.error(
          `Failed to handle ${AuthEvents.TOKEN_REFRESHED} event - userId: ${userId}`,
          error instanceof Error ? error.stack : String(error),
          {
            eventType: AuthEvents.TOKEN_REFRESHED,
            userId,
          },
        );
        return;
      }
    }

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      AuthActivityType.TOKEN_REFRESHED,
      {
        userId,
        email:
          'email' in actor && typeof actor.email === 'string'
            ? actor.email
            : userId,
      },
      actor,
    );
  }
}
