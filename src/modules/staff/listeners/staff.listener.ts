import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { CreateStaffEvent } from '../events/staff.events';
import { StaffEvents } from '@/shared/events/staff.events.enum';
import {
  GrantCenterAccessEvent,
  GrantUserAccessEvent,
  AssignRoleEvent,
} from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';

@Injectable()
export class StaffListener {
  constructor(
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
  ) {}

  @OnEvent(StaffEvents.CREATE)
  async handleCreateStaff(event: CreateStaffEvent) {
    const { dto, actor, staff } = event;

    // Create user directly - service will emit UserCreatedEvent
    const createdUser = await this.userService.createUser(dto, actor);

    // Create staff profile for the user
    const userProfile = await this.userProfileService.createUserProfile(
      createdUser.id,
      ProfileType.STAFF,
      staff.id,
    );
    
    const centerId = dto.centerId ?? actor.centerId;

    // Grant center access
    if (centerId) {
      await this.typeSafeEventEmitter.emitAsync(
        AccessControlEvents.GRANT_CENTER_ACCESS,
        new GrantCenterAccessEvent(userProfile.id, centerId, actor),
      );
      await this.typeSafeEventEmitter.emitAsync(
        AccessControlEvents.GRANT_USER_ACCESS,
        new GrantUserAccessEvent(
          actor.userProfileId,
          userProfile.id,
          actor,
          centerId,
        ),
      );
      if (dto.roleId) {
        await this.typeSafeEventEmitter.emitAsync(
          AccessControlEvents.ASSIGN_ROLE,
          new AssignRoleEvent(userProfile.id, dto.roleId, actor, centerId),
        );
      }
    }

    // Note: Activity logging is now handled by UserActivityListener listening to UserEvents.CREATED
    // No need to manually log here as the domain event will trigger the activity log
  }
}
