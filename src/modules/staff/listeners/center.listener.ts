import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StaffRepository } from '../repositories/staff.repository';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { UserService } from '@/modules/user/services/user.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CenterActivityType } from '@/modules/centers/enums/center-activity-type.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  CreateCenterEvent,
  AssignCenterOwnerEvent,
  CreateCenterBranchEvent,
} from '@/modules/centers/events/center.events';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { GrantCenterAccessEvent } from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { CreateUserEvent } from '@/modules/user/events/user.events';
import { UserEvents } from '@/shared/events/user.events.enum';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { User } from '@/modules/user/entities/user.entity';

@Injectable()
export class CenterListener {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @OnEvent(CenterEvents.CREATE)
  async handleCenterCreated(event: CreateCenterEvent) {
    const { center, userData, actor, branchData } = event;

    await this.activityLogService.log(CenterActivityType.CENTER_CREATED, {
      centerId: center.id,
      centerName: center.name,
      email: center.email,
      phone: center.phone,
      website: center.website,
      isActive: center.isActive,
    });

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

      const [{ userProfile: createdUserProfile }] =
        (await this.eventEmitter.emitAsync(
          UserEvents.CREATE,
          new CreateUserEvent(userData, actor, staff.id, ProfileType.STAFF),
        )) as [{ user: User; userProfile: UserProfile }];

      userProfile = createdUserProfile;

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
