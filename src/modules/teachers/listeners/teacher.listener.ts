import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CreateTeacherEvent,
  TeacherCreatedEvent,
} from '../events/teacher.events';
import { TeacherEvents } from '@/shared/events/teacher.events.enum';
import { UserEvents } from '@/shared/events/user.events.enum';
import {
  GrantCenterAccessEvent,
  GrantUserAccessEvent,
} from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { UserCreatedEvent } from '@/modules/user/events/user.events';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { RequestPhoneVerificationEvent } from '@/modules/auth/events/auth.events';

@Injectable()
export class TeacherListener {
  constructor(
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  @OnEvent(TeacherEvents.CREATE)
  async handleCreateTeacher(event: CreateTeacherEvent) {
    const { user, userProfile, actor, teacher, centerId } = event;

    // Grant center access
    if (centerId) {
      await this.typeSafeEventEmitter.emitAsync(
        AccessControlEvents.GRANT_CENTER_ACCESS,
        new GrantCenterAccessEvent(userProfile.id, centerId, actor, user.id),
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
    }

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      UserEvents.CREATED,
      new UserCreatedEvent(user, userProfile, actor),
    );

    // Emit profile creation event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      TeacherEvents.CREATED,
      new TeacherCreatedEvent(user, userProfile, actor, teacher, centerId),
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
