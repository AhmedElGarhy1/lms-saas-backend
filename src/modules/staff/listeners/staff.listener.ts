import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CreateStaffEvent } from '../events/staff.events';
import { StaffEvents } from '@/shared/events/staff.events.enum';
import { UserEvents } from '@/shared/events/user.events.enum';
import { GrantUserAccessEvent } from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { UserCreatedEvent } from '@/modules/user/events/user.events';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { RequestPhoneVerificationEvent } from '@/modules/auth/events/auth.events';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { RolesService } from '@/modules/access-control/services/roles.service';

@Injectable()
export class StaffListener {
  constructor(
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly accessControlService: AccessControlService,
    private readonly rolesService: RolesService,
  ) {}

  @OnEvent(StaffEvents.CREATE)
  async handleCreateStaff(event: CreateStaffEvent) {
    const {
      user,
      userProfile,
      actor,
      staff,
      centerId,
      roleId,
      isCenterAccessActive,
    } = event;

    if (centerId) {
      await this.accessControlService.grantCenterAccess(
        {
          userProfileId: userProfile.id,
          centerId,
          isActive: isCenterAccessActive ?? true,
        },
        actor,
        true,
        true,
      );
      await this.typeSafeEventEmitter.emitAsync(
        AccessControlEvents.GRANT_USER_ACCESS,
        new GrantUserAccessEvent(
          actor.userProfileId,
          userProfile.id,
          actor,
          centerId,
          user.id,
        ),
      );
      if (roleId) {
        await this.rolesService.assignRole(
          { userProfileId: userProfile.id, roleId, centerId },
          actor,
        );
      }
    }

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      UserEvents.CREATED,
      new UserCreatedEvent(user, userProfile, actor),
    );

    // Send phone verification OTP via event (notification service will fetch phone)
    if (user.phone && user.id) {
      try {
        await this.typeSafeEventEmitter.emitAsync(
          AuthEvents.PHONE_VERIFICATION_SEND_REQUESTED,
          new RequestPhoneVerificationEvent(user.id),
        );
      } catch {
        // Log error but don't fail user creation
        // Verification failures are logged by VerificationListener
      }
    }
  }
}
