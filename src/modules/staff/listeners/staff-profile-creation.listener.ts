import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StaffRepository } from '../repositories/staff.repository';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  CreateStaffProfileEvent,
  StaffProfileCreatedEvent,
  StaffEvents,
} from '@/modules/staff/events/staff.events';

@Injectable()
export class StaffProfileCreationListener {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userProfileService: UserProfileService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(StaffEvents.PROFILE_CREATE)
  async handleCreateStaffProfile(event: CreateStaffProfileEvent) {
    const { userId, dto, actor } = event;

    // Create staff entity
    const staff = await this.staffRepository.create({});

    // Create user profile
    const userProfile = await this.userProfileService.createUserProfile(
      userId,
      ProfileType.STAFF,
      staff.id,
    );

    // Emit profile created event
    this.eventEmitter.emit(
      StaffEvents.PROFILE_CREATED,
      new StaffProfileCreatedEvent(
        userId,
        userProfile.id,
        staff.id,
        dto,
        actor,
      ),
    );
  }
}
