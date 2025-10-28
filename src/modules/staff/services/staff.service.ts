import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StaffRepository } from '../repositories/staff.repository';
import { UserService } from '@/modules/user/services/user.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { CreateStaffDto } from '../dto/create-staff.dto';
import { UpdateStaffDto } from '../dto/update-staff.dto';
import { PaginateStaffDto } from '../dto/paginate-staff.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { User } from '@/modules/user/entities/user.entity';
import { Staff } from '../entities/staff.entity';
import {
  CreateStaffEvent,
  StaffEvents,
} from '@/modules/staff/events/staff.events';
import {
  UpdateUserEvent,
  DeleteUserEvent,
  RestoreUserEvent,
  ActivateUserEvent,
  UserEvents,
} from '@/modules/user/events/user.events';

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userService: UserService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createStaff(dto: CreateStaffDto, actor: ActorUser): Promise<void> {
    // Emit event to create staff (listener handles everything)
    await this.eventEmitter.emitAsync(
      StaffEvents.CREATE,
      new CreateStaffEvent(dto, actor),
    );

    // The listener will handle user creation
  }

  async paginateStaff(params: PaginateStaffDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;
    return this.userService.paginateStaff(params, actor);
  }

  async updateStaff(
    userId: string,
    updateData: UpdateStaffDto,
    actor: ActorUser,
  ): Promise<User> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: actor.userProfileId,
    });

    const user = await this.userService.updateUser(userId, updateData, actor);

    // Emit event for activity logging
    await this.eventEmitter.emitAsync(
      UserEvents.UPDATE,
      new UpdateUserEvent(userId, updateData, actor),
    );

    return user;
  }

  async deleteStaff(userId: string, actor: ActorUser): Promise<void> {
    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new Error('Access denied');
    }

    await this.userService.deleteUser(userId, actor);

    // Emit event for activity logging
    await this.eventEmitter.emitAsync(
      UserEvents.DELETE,
      new DeleteUserEvent(userId, actor),
    );
  }

  async restoreStaff(userId: string, actor: ActorUser): Promise<void> {
    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new Error('Access denied');
    }

    await this.userService.restoreUser(userId, actor);

    // Emit event for activity logging
    await this.eventEmitter.emitAsync(
      UserEvents.RESTORE,
      new RestoreUserEvent(userId, actor),
    );
  }

  async toggleStaffStatus(
    userId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: actor.userProfileId,
    });

    await this.userService.activateUser(userId, isActive, actor);

    // Emit event for activity logging
    await this.eventEmitter.emitAsync(
      UserEvents.ACTIVATE,
      new ActivateUserEvent(userId, isActive, actor),
    );
  }

  async findOne(userId: string): Promise<User> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async createStaffForUser(
    userId: string,
    staffData: Partial<Staff> = {},
  ): Promise<any> {
    // Create staff record
    const staff = await this.staffRepository.create(staffData);

    // Note: This method is kept for backward compatibility
    // The actual profile creation should be handled via events
    // This is a simplified version for direct calls
    return staff;
  }
}
