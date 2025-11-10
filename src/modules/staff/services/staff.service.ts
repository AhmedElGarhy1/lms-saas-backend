import { ForbiddenException, Injectable } from '@nestjs/common';
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
import { CreateStaffEvent } from '@/modules/staff/events/staff.events';
import { StaffEvents } from '@/shared/events/staff.events.enum';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { InsufficientPermissionsException } from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userService: UserService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  async createStaff(dto: CreateStaffDto, actor: ActorUser): Promise<void> {
    // Create staff entity
    const staff = await this.staffRepository.create({});

    await this.typeSafeEventEmitter.emitAsync(
      StaffEvents.CREATE,
      new CreateStaffEvent(dto, actor, staff),
    );
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

    return await this.userService.updateUser(userId, updateData, actor);
  }

  async deleteStaff(userId: string, actor: ActorUser): Promise<void> {
    const isAdmin = await this.accessControlHelperService.isAdmin(
      actor.userProfileId,
    );
    if (!isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to delete this staff',
      );
    }

    await this.userService.deleteUser(userId, actor);
  }

  async restoreStaff(userId: string, actor: ActorUser): Promise<void> {
    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new Error('Access denied');
    }

    await this.userService.restoreUser(userId, actor);
  }

  async deleteStaffAccess(
    userProfileId: string,
    actor: ActorUser,
  ): Promise<void> {
    if (!actor.centerId)
      throw new ForbiddenException(
        'You are not authorized to delete this staff access',
      );

    // Note: deleteCenterAccess is not a user command, so no user event emission here
    await this.userService.deleteCenterAccess(
      {
        centerId: actor.centerId,
        userProfileId: userProfileId,
      },
      actor,
    );
  }

  async restoreStaffAccess(
    userProfileId: string,
    actor: ActorUser,
  ): Promise<void> {
    if (!actor.centerId)
      throw new ForbiddenException(
        'You are not authorized to restore this staff access',
      );
    // Note: restoreCenterAccess is not a user command, so no user event emission here
    await this.userService.restoreCenterAccess(
      {
        centerId: actor.centerId,
        userProfileId: userProfileId,
      },
      actor,
    );
  }

  async toggleStaffStatus(
    userProfileId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    await this.userService.activateCenterAccess(userProfileId, isActive, actor);
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
