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
  CreateCenterBranchEvent,
} from '@/modules/centers/events/center.events';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { GrantCenterAccessEvent } from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';

@Injectable()
export class CenterListener {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(CenterEvents.CREATED)
  async handleCenterCreated(event: CreateCenterEvent) {
    const { center, userData, actor, branchData } = event;

    if (!actor) {
      throw new Error('Actor is required for center creation');
    }

    // Note: Activity logging is now handled by CenterActivityListener listening to CenterEvents.CREATED
    // No need to manually log here as the domain event will trigger the activity log

    // Grant actor center access
    await this.eventEmitter.emitAsync(
      AccessControlEvents.GRANT_CENTER_ACCESS,
      new GrantCenterAccessEvent(actor.userProfileId, center.id, actor),
    );

    let userProfile: UserProfile | undefined;

    // Only create user if userData is provided
    if (userData) {
      // Create staff profile for center owner
      const staff = await this.staffRepository.create({});

      // Create user directly - service will emit UserCreatedEvent
      const createdUser = await this.userService.createUser(userData, actor);

      // Create staff profile for the user
      userProfile = await this.userProfileService.createUserProfile(
        createdUser.id,
        ProfileType.STAFF,
        staff.id,
      );

      // Grant staff center access
      await this.eventEmitter.emitAsync(
        AccessControlEvents.GRANT_CENTER_ACCESS,
        new GrantCenterAccessEvent(userProfile.id, center.id, actor),
      );
    }

    // Always emit ASSIGN_OWNER event to create owner role
    // Role will be assigned only if userProfile exists
    await this.eventEmitter.emitAsync(
      CenterEvents.ASSIGN_OWNER,
      new AssignCenterOwnerEvent(center, userProfile, actor),
    );

    if (branchData) {
      await this.eventEmitter.emitAsync(
        CenterEvents.CREATE_BRANCH,
        new CreateCenterBranchEvent(center, branchData, actor),
      );
    }
  }
}
