import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  CreateCenterEvent,
  CreateCenterOwnerEvent,
  AssignCenterOwnerEvent,
  CreateCenterBranchEvent,
} from '@/modules/centers/events/center.events';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { GrantCenterAccessEvent } from '@/modules/access-control/events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { CreateUserProfileDto } from '@/modules/user-profile/dto/create-user-profile.dto';
import { createOwnerRoleData } from '@/modules/access-control/constants/roles';
import { RolesService } from '@/modules/access-control/services/roles.service';

@Injectable()
export class CenterListener {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly rolesService: RolesService,
  ) {}

  @OnEvent(CenterEvents.CREATED)
  async handleCenterCreated(event: CreateCenterEvent) {
    const { center, userData, actor, branchData } = event;

    // Grant actor center access
    await this.typeSafeEventEmitter.emitAsync(
      AccessControlEvents.GRANT_CENTER_ACCESS,
      new GrantCenterAccessEvent(actor.userProfileId, center.id, actor),
    );

    // create owner role
    const ownerRole = await this.rolesService.createRole(
      createOwnerRoleData(center.id),
      actor,
    );

    // Emit CREATE_OWNER event if userData is provided
    // This will trigger handleCreateCenterOwner() which creates the staff profile
    console.log('userData', userData);
    if (userData) {
      await this.typeSafeEventEmitter.emitAsync(
        CenterEvents.CREATE_OWNER,
        new CreateCenterOwnerEvent(center, userData, ownerRole.id, actor),
      );
    }
    if (branchData) {
      await this.typeSafeEventEmitter.emitAsync(
        CenterEvents.CREATE_BRANCH,
        new CreateCenterBranchEvent(center, branchData, actor),
      );
    }
  }

  @OnEvent(CenterEvents.CREATE_OWNER)
  async handleCreateCenterOwner(event: CreateCenterOwnerEvent) {
    const { center, userData, actor, roleId } = event;

    // Convert userData to CreateUserProfileDto with ProfileType.STAFF and centerId
    const profileDto: CreateUserProfileDto = {
      ...userData,
      profileType: ProfileType.STAFF,
      centerId: center.id,
      roleId: roleId,
    };

    // Create profile - this will emit CreateStaffEvent → StaffListener handles access control
    // StaffListener will automatically grant center access via CreateStaffEvent
    await this.userProfileService.createProfile(profileDto, actor);
  }
}
