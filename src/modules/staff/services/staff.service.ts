import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { StaffRepository } from '../repositories/staff.repository';
import { UserService } from '@/modules/user/services/user.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { PaginateStaffDto } from '../dto/paginate-staff.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { User } from '@/modules/user/entities/user.entity';
import { Staff } from '../entities/staff.entity';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class StaffService extends BaseService {
  private readonly logger: Logger = new Logger(StaffService.name);

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userService: UserService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super();
  }

  async paginateStaff(params: PaginateStaffDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;
    return this.userService.paginateStaff(params, actor);
  }

  async deleteStaffAccess(
    userProfileId: string,
    actor: ActorUser,
  ): Promise<void> {
    if (!actor.centerId) {
      throw new ForbiddenException(
        'You are not authorized to delete this staff access',
      );
    }

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
    if (!actor.centerId) {
      throw new ForbiddenException(
        'You are not authorized to restore this staff access',
      );
    }
    // Note: restoreCenterAccess is not a user command, so no user event emission here
    await this.userService.restoreCenterAccess(
      {
        centerId: actor.centerId,
        userProfileId: userProfileId,
      },
      actor,
    );
  }

  async findOne(userProfileId: string, actor: ActorUser): Promise<User> {
    // Validate that actor has access to this user profile
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: userProfileId,
      centerId: actor.centerId,
    });

    // Find user by profileId
    const user = await this.userService.findUserByProfileId(
      userProfileId,
      actor,
    );
    if (!user) {
      throw new ResourceNotFoundException(
        'User not found',
        't.errors.userNotFound',
      );
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
