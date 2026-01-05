import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CreateAdminEvent,
  AdminCreatedEvent,
  AdminExportedEvent,
} from '../events/admin.events';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { AdminActivityType } from '../enums/admin-activity-type.enum';
import { UserEvents } from '@/shared/events/user.events.enum';
import {
  AssignRoleEvent,
  GrantUserAccessEvent,
} from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { UserCreatedEvent } from '@/modules/user/events/user.events';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { RequestPhoneVerificationEvent } from '@/modules/auth/events/auth.events';

@Injectable()
export class AdminListener {
  constructor(private readonly typeSafeEventEmitter: TypeSafeEventEmitter) {}

  @OnEvent(AdminEvents.CREATE)
  async handleCreateAdmin(event: CreateAdminEvent) {
    const { user, userProfile, actor, admin, roleId } = event;

    // Grant user access
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

    // Assign role if specified (admin roles are global, no center required)
    if (roleId) {
      await this.typeSafeEventEmitter.emitAsync(
        AccessControlEvents.ASSIGN_ROLE,
        new AssignRoleEvent(userProfile.id, roleId, actor, undefined, user.id),
      );
    }

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      UserEvents.CREATED,
      new UserCreatedEvent(user, userProfile, actor),
    );

    // Emit profile creation event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      AdminEvents.CREATED,
      new AdminCreatedEvent(user, userProfile, actor, admin, roleId),
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

  @OnEvent(AdminEvents.EXPORTED)
  async handleAdminExported(event: AdminExportedEvent) {}
}
