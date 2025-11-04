import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import { CreateStaffEvent } from '../events/staff.events';
import { StaffEvents } from '@/shared/events/staff.events.enum';
import {
  GrantCenterAccessEvent,
  GrantUserAccessEvent,
  AssignRoleEvent,
} from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { CreateUserEvent } from '@/modules/user/events/user.events';
import { UserEvents } from '@/shared/events/user.events.enum';
import { User } from '@/modules/user/entities/user.entity';

@Injectable()
export class StaffListener {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @OnEvent(StaffEvents.CREATE)
  async handleCreateStaff(event: CreateStaffEvent) {
    const { dto, actor, staff } = event;

    const [{ userProfile, user }] = (await this.eventEmitter.emitAsync(
      UserEvents.CREATE,
      new CreateUserEvent(dto, actor, staff.id, ProfileType.STAFF),
    )) as [{ user: User; userProfile: UserProfile }];
    const centerId = dto.centerId ?? actor.centerId;

    // Grant center access
    if (centerId) {
      await this.eventEmitter.emitAsync(
        AccessControlEvents.GRANT_CENTER_ACCESS,
        new GrantCenterAccessEvent(userProfile.id, centerId, actor),
      );
      await this.eventEmitter.emitAsync(
        AccessControlEvents.GRANT_USER_ACCESS,
        new GrantUserAccessEvent(
          actor.userProfileId,
          userProfile.id,
          actor,
          centerId,
        ),
      );
      if (dto.roleId) {
        await this.eventEmitter.emitAsync(
          AccessControlEvents.ASSIGN_ROLE,
          new AssignRoleEvent(userProfile.id, dto.roleId, actor, centerId),
        );
      }
    }

    // Log activity
    await this.activityLogService.log(
      UserActivityType.USER_CREATED,
      {
        targetUserId: user.id,
        email: user.email,
        name: user.name,
        profileType: ProfileType.STAFF,
        createdBy: actor.id,
      },
      actor,
    );
  }
}
