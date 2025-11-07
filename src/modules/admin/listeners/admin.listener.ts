import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { CreateAdminEvent } from '../events/admin.events';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { UserEvents } from '@/shared/events/user.events.enum';
import {
  AssignRoleEvent,
  GrantUserAccessEvent,
} from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { UserCreatedEvent } from '@/modules/user/events/user.events';
import { VerificationService } from '@/modules/auth/services/verification.service';

@Injectable()
export class AdminListener {
  constructor(
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly verificationService: VerificationService,
  ) {}

  @OnEvent(AdminEvents.CREATE)
  async handleCreateAdmin(event: CreateAdminEvent) {
    const { dto, actor, admin } = event;

    // Create user directly - service will emit UserCreatedEvent
    const createdUser = await this.userService.createUser(dto, actor);

    // Create admin profile for the user
    const userProfile = await this.userProfileService.createUserProfile(
      createdUser.id,
      ProfileType.ADMIN,
      admin.id,
    );

    // Grant user access
    await this.typeSafeEventEmitter.emitAsync(
      AccessControlEvents.GRANT_USER_ACCESS,
      new GrantUserAccessEvent(
        actor.userProfileId,
        userProfile.id,
        actor,
        actor.centerId,
      ),
    );

    // Assign role if specified (admin roles are global, no center required)
    if (dto.roleId) {
      await this.typeSafeEventEmitter.emitAsync(
        AccessControlEvents.ASSIGN_ROLE,
        new AssignRoleEvent(userProfile.id, dto.roleId, actor),
      );
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
      } catch (error) {
        console.error(error);
        // Log error but don't fail user creation
        // Verification failures are logged by VerificationService
      }
    }

    // Note: Activity logging is now handled by UserActivityListener listening to UserEvents.CREATED
    // No need to manually log here as the domain event will trigger the activity log
  }
}
