import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { AuthActivityType } from '../enums/auth-activity-type.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { UserLoggedOutEvent, TokenRefreshedEvent } from '../events/auth.events';
import { UserService } from '@/modules/user/services/user.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class AuthListener {
  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly userService: UserService,
  ) {}

  @OnEvent(AuthEvents.USER_LOGGED_OUT)
  async handleUserLoggedOut(event: UserLoggedOutEvent) {
    const { userId } = event;

    // Use actor from event if available, otherwise build from user
    let actor = event.actor;
    if (!actor) {
      const user = await this.userService.findOne(userId);
      if (!user) {
        return;
      }
      actor = {
        id: user.id,
        userProfileId: user.id, // Temporary - will be updated when we have profile info
        profileType: 'USER' as any,
        centerId: undefined,
      } as ActorUser;
    }

    await this.activityLogService.log(
      AuthActivityType.USER_LOGOUT,
      {
        userId,
        email: (actor as any).email || userId,
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
      const user = await this.userService.findOne(userId);
      if (!user) {
        return;
      }
      actor = {
        id: user.id,
        userProfileId: user.id, // Temporary - will be updated when we have profile info
        profileType: 'USER' as any,
        centerId: undefined,
      } as ActorUser;
    }

    await this.activityLogService.log(
      AuthActivityType.TOKEN_REFRESHED,
      {
        userId,
        email: (actor as any).email || userId,
      },
      actor,
    );
  }
}
