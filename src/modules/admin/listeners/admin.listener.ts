import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminRepository } from '../repositories/admin.repository';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { UserService } from '@/modules/user/services/user.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import { CreateAdminEvent, AdminEvents } from '../events/admin.events';
import {
  GrantCenterAccessEvent,
  GrantUserAccessEvent,
  AssignRoleEvent,
  AccessControlEvents,
} from '@/modules/access-control/events/access-control.events';
import { UserEvents } from '@/shared/events/event-types.enum';
import { CreateUserEvent } from '@/modules/user/events/user.events';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { User } from '@/modules/user/entities/user.entity';

@Injectable()
export class AdminListener {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @OnEvent(AdminEvents.CREATE)
  async handleCreateAdmin(event: CreateAdminEvent) {
    const { dto, actor, admin } = event;
    const centerId = dto.centerId ?? actor.centerId;

    const [{ userProfile, user }] = (await this.eventEmitter.emitAsync(
      UserEvents.CREATE,
      new CreateUserEvent(dto, actor, admin.id, ProfileType.ADMIN),
    )) as [{ user: User; userProfile: UserProfile }];

    console.log('--------------------------------');
    console.log('--------------------------------');
    console.log('handleCreateAdmin -> userProfile', userProfile);
    console.log('handleCreateAdmin -> user', user);
    console.log('--------------------------------');
    console.log('--------------------------------');

    // Grant center access
    if (centerId) {
      await this.eventEmitter.emitAsync(
        AccessControlEvents.GRANT_CENTER_ACCESS,
        new GrantCenterAccessEvent(userProfile.id, centerId, actor),
      );
    }

    // Grant user access
    if (centerId) {
      await this.eventEmitter.emitAsync(
        AccessControlEvents.GRANT_USER_ACCESS,
        new GrantUserAccessEvent(
          actor.userProfileId,
          userProfile.id,
          centerId,
          actor,
        ),
      );
    }

    // Assign role if specified
    if (dto.roleId && centerId) {
      await this.eventEmitter.emitAsync(
        AccessControlEvents.ASSIGN_ROLE,
        new AssignRoleEvent(userProfile.id, dto.roleId, centerId, actor),
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
