import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CreateAdminEvent } from '../events/admin.events';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { UserEvents } from '@/shared/events/user.events.enum';
import { GrantUserAccessEvent } from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { UserCreatedEvent } from '@/modules/user/events/user.events';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { RequestPhoneVerificationEvent } from '@/modules/auth/events/auth.events';
import { RolesService } from '@/modules/access-control/services/roles.service';

@Injectable()
export class AdminListener {
  constructor(
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly rolesService: RolesService,
  ) {}

  @OnEvent(AdminEvents.CREATE)
  async handleCreateAdmin(event: CreateAdminEvent) {
    const { user, userProfile, actor, admin, roleId } = event;

    await this.typeSafeEventEmitter.emitAsync(
      AccessControlEvents.GRANT_USER_ACCESS,
      new GrantUserAccessEvent(
        actor.userProfileId,
        userProfile.id,
        actor,
        actor.centerId,
        user.id,
      ),
    );

    if (roleId) {
      await this.rolesService.assignRole(
        { userProfileId: userProfile.id, roleId, centerId: undefined },
        actor,
      );
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
