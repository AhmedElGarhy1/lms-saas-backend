import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { UserService } from '@/modules/user/services/user.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import {
  GrantCenterAccessEvent,
  GrantUserAccessEvent,
  AssignRoleEvent,
  AccessControlEvents,
} from '@/modules/access-control/events/access-control.events';
import { UserEvents } from '@/shared/events/event-types.enum';
import { CreateAdminEvent } from '@/modules/admin/events/admin.events';
import { CreateUserEvent } from '../events/user.events';

@Injectable()
export class UserListener {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @OnEvent(UserEvents.CREATE)
  async handleCreateUser(event: CreateUserEvent) {
    const { dto, actor, targetProfileId, targetProfileType } = event;

    // Create user
    const user = await this.userService.createUser(dto, actor);

    // Create user profile
    const userProfile = await this.userProfileService.createUserProfile(
      user.id,
      targetProfileType,
      targetProfileId,
    );

    return {
      user,
      userProfile,
    };
  }
}
