import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CreateStudentEvent,
} from '../events/student.events';
import { StudentEvents } from '@/shared/events/student.events.enum';
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
export class StudentListener {
  constructor(
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  @OnEvent(StudentEvents.CREATE)
  async handleCreateStudent(event: CreateStudentEvent) {
    const { user, userProfile, actor, student, centerId, isCenterAccessActive } = event;

    // Grant center access
    if (centerId) {
      await this.typeSafeEventEmitter.emitAsync(
        AccessControlEvents.GRANT_CENTER_ACCESS,
        new GrantCenterAccessEvent(userProfile.id, centerId, actor, user.id, isCenterAccessActive),
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
