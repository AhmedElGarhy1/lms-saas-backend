import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { UserService } from '@/modules/user/services/user.service';
import { AdminRepository } from '../repositories/admin.repository';
import {
  AdminAccessSetupNeededEvent,
  AdminCreatedEvent,
  AdminEvents,
} from '@/modules/admin/events/admin.events';

@Injectable()
export class AdminRoleAssignmentListener {
  constructor(
    private readonly rolesService: RolesService,
    private readonly userService: UserService,
    private readonly adminRepository: AdminRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(AdminEvents.ACCESS_SETUP_NEEDED)
  async handleAdminAccessSetupNeeded(event: AdminAccessSetupNeededEvent) {
    const { userProfileId, dto, actor } = event;
    const centerId = dto.centerId ?? actor.centerId;

    // Assign role
    if (dto.roleId) {
      await this.rolesService.assignRole(
        {
          userProfileId,
          roleId: dto.roleId,
          centerId,
        },
        actor,
      );
    }

    // Get user and admin for completion event
    const user = await this.userService.findOne(event.userId);
    const admin = await this.adminRepository.findOne(event.adminId);

    if (user && admin) {
      this.eventEmitter.emit(
        AdminEvents.CREATED,
        new AdminCreatedEvent(user, admin, actor),
      );
    }
  }
}
