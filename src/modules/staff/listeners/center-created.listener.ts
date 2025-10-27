import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StaffRepository } from '../repositories/staff.repository';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  CenterCreatedEvent,
  CenterOwnerAssignedEvent,
  CenterEvents,
} from '@/modules/centers/events/center.events';

@Injectable()
export class CenterCreatedListener {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userProfileService: UserProfileService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(CenterEvents.CREATED)
  async handleCenterCreated(event: CenterCreatedEvent) {
    const { center, user, actor } = event;

    // Create staff profile for center owner
    const staff = await this.staffRepository.create({});
    const userProfile = await this.userProfileService.createUserProfile(
      user.id,
      ProfileType.STAFF,
      staff.id,
    );

    // Emit event for role assignment
    this.eventEmitter.emit(
      CenterEvents.OWNER_ASSIGNED,
      new CenterOwnerAssignedEvent(center, userProfile, actor),
    );
  }
}
