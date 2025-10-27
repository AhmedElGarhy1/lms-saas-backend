import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StaffRepository } from '../repositories/staff.repository';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { UserService } from '@/modules/user/services/user.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  CreateStaffEvent,
  StaffCreatedEvent,
  StaffEvents,
} from '../events/staff.events';
import {
  GrantCenterAccessEvent,
  GrantUserAccessEvent,
  AssignRoleEvent,
  AccessControlEvents,
} from '@/modules/access-control/events/access-control.events';

@Injectable()
export class StaffListener {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(StaffEvents.CREATE)
  async handleCreateStaff(event: CreateStaffEvent) {
    const { dto, actor } = event;

    // Create user
    const user = await this.userService.createUser(dto, actor);

    // Create staff entity
    const staff = await this.staffRepository.create({});

    // Create user profile
    const userProfile = await this.userProfileService.createUserProfile(
      user.id,
      ProfileType.STAFF,
      staff.id,
    );

    const centerId = dto.centerId ?? actor.centerId;

    // Grant center access
    if (centerId) {
      this.eventEmitter.emit(
        AccessControlEvents.GRANT_CENTER_ACCESS,
        new GrantCenterAccessEvent(userProfile.id, centerId, actor),
      );
    }

    // Grant user access
    if (centerId) {
      this.eventEmitter.emit(
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
      this.eventEmitter.emit(
        AccessControlEvents.ASSIGN_ROLE,
        new AssignRoleEvent(userProfile.id, dto.roleId, centerId, actor),
      );
    }

    // Emit completion event
    this.eventEmitter.emit(
      StaffEvents.CREATED,
      new StaffCreatedEvent(user, staff, actor),
    );
  }
}
