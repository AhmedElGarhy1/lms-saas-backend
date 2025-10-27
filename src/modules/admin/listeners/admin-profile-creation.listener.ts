import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminRepository } from '../repositories/admin.repository';
import { UserProfileService } from '@/modules/user/services/user-profile.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  CreateAdminProfileEvent,
  AdminProfileCreatedEvent,
  AdminEvents,
} from '@/modules/admin/events/admin.events';

@Injectable()
export class AdminProfileCreationListener {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly userProfileService: UserProfileService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(AdminEvents.PROFILE_CREATE)
  async handleCreateAdminProfile(event: CreateAdminProfileEvent) {
    const { userId, dto, actor } = event;

    // Create admin entity
    const admin = await this.adminRepository.create({});

    // Create user profile
    const userProfile = await this.userProfileService.createUserProfile(
      userId,
      ProfileType.ADMIN,
      admin.id,
    );

    // Emit profile created event
    this.eventEmitter.emit(
      AdminEvents.PROFILE_CREATED,
      new AdminProfileCreatedEvent(
        userId,
        userProfile.id,
        admin.id,
        dto,
        actor,
      ),
    );
  }
}
