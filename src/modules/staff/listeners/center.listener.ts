import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StaffRepository } from '../repositories/staff.repository';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { UserService } from '@/modules/user/services/user.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  CreateCenterEvent,
  AssignCenterOwnerEvent,
  CenterEvents,
} from '@/modules/centers/events/center.events';
import {
  GrantCenterAccessEvent,
  GrantUserAccessEvent,
  AccessControlEvents,
} from '@/modules/access-control/events/access-control.events';

@Injectable()
export class CenterListener {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(CenterEvents.CREATE)
  async handleCenterCreated(event: CreateCenterEvent) {
    const { center, userData, actor } = event;

    // Create user first
    const user = await this.userService.createUser(userData, actor);

    // Create staff profile for center owner
    const staff = await this.staffRepository.create({});
    const userProfile = await this.userProfileService.createUserProfile(
      user.id,
      ProfileType.STAFF,
      staff.id,
    );

    // Grant center access
    await this.eventEmitter.emitAsync(
      AccessControlEvents.GRANT_CENTER_ACCESS,
      new GrantCenterAccessEvent(userProfile.id, center.id, actor),
    );

    // Grant user access
    await this.eventEmitter.emitAsync(
      AccessControlEvents.GRANT_USER_ACCESS,
      new GrantUserAccessEvent(
        actor.userProfileId,
        userProfile.id,
        center.id,
        actor,
      ),
    );

    // Emit event for role assignment
    await this.eventEmitter.emitAsync(
      CenterEvents.ASSIGN_OWNER,
      new AssignCenterOwnerEvent(center, userProfile, actor),
    );
  }
}
