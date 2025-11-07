import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { CreateStaffEvent } from '../events/staff.events';
import { StaffEvents } from '@/shared/events/staff.events.enum';
import { UserEvents } from '@/shared/events/user.events.enum';
import {
  GrantCenterAccessEvent,
  GrantUserAccessEvent,
  AssignRoleEvent,
} from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { UserCreatedEvent } from '@/modules/user/events/user.events';
import { VerificationService } from '@/modules/auth/services/verification.service';

@Injectable()
export class StaffListener {
  constructor(
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly verificationService: VerificationService,
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

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      UserEvents.CREATED,
      new UserCreatedEvent(createdUser, userProfile, actor),
    );

    // Send phone verification OTP directly (if user has phone)
    if (createdUser.phone && createdUser.id) {
      try {
        await this.verificationService.sendPhoneVerification(
          createdUser.id,
          createdUser.getPhone(),
        );
      } catch {
        // Log error but don't fail user creation
        // Verification failures are logged by VerificationService
      }
    }
  }
}
