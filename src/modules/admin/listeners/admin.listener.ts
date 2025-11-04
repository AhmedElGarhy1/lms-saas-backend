import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import { CreateAdminEvent } from '../events/admin.events';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import {
  AssignRoleEvent,
  GrantUserAccessEvent,
} from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { UserEvents } from '@/shared/events/user.events.enum';
import { CreateUserEvent } from '@/modules/user/events/user.events';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { User } from '@/modules/user/entities/user.entity';

@Injectable()
export class AdminListener {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @OnEvent(AdminEvents.CREATE)
  async handleCreateAdmin(event: CreateAdminEvent) {
    const { dto, actor, admin } = event;

    const [{ userProfile, user }] = (await this.eventEmitter.emitAsync(
      UserEvents.CREATE,
      new CreateUserEvent(dto, actor, admin.id, ProfileType.ADMIN),
    )) as [{ user: User; userProfile: UserProfile }];

    // grant user access
    await this.eventEmitter.emitAsync(
      AccessControlEvents.GRANT_USER_ACCESS,
      new GrantUserAccessEvent(
        actor.userProfileId,
        userProfile.id,
        actor,
        actor.centerId,
      ),
    );

    // Assign role if specified (admin roles are global, no center required)
    if (dto.roleId) {
      await this.eventEmitter.emitAsync(
        AccessControlEvents.ASSIGN_ROLE,
        new AssignRoleEvent(userProfile.id, dto.roleId, actor),
      );
    }

    // Log activity
    await this.activityLogService.log(
      UserActivityType.USER_CREATED,
      {
        targetUserId: user.id,
        targetUserProfileId: userProfile.id,
        email: user.email,
        name: user.name,
        profileType: 'ADMIN',
        createdBy: actor.id,
      },
      actor,
    );
  }
}
