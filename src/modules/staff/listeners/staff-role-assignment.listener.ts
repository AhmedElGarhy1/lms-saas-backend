import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { UserService } from '@/modules/user/services/user.service';
import { StaffRepository } from '../repositories/staff.repository';
import {
  StaffAccessSetupNeededEvent,
  StaffCreatedEvent,
  StaffEvents,
} from '@/modules/staff/events/staff.events';

@Injectable()
export class StaffRoleAssignmentListener {
  constructor(
    private readonly rolesService: RolesService,
    private readonly userService: UserService,
    private readonly staffRepository: StaffRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(StaffEvents.ACCESS_SETUP_NEEDED)
  async handleStaffAccessSetupNeeded(event: StaffAccessSetupNeededEvent) {
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

    // Get user and staff for completion event
    const user = await this.userService.findOne(event.userId);
    const staff = await this.staffRepository.findOne(event.staffId);

    if (user && staff) {
      this.eventEmitter.emit(
        StaffEvents.CREATED,
        new StaffCreatedEvent(user, staff, actor),
      );
    }
  }
}
