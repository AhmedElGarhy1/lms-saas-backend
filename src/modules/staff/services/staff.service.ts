import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { StaffRepository } from '../repositories/staff.repository';
import { UserService } from '@/modules/user/services/user.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { PaginateStaffDto } from '../dto/paginate-staff.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { User } from '@/modules/user/entities/user.entity';
import { Staff } from '../entities/staff.entity';
import {
  ResourceNotFoundException,
} from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@Injectable()
export class StaffService extends BaseService {
  private readonly logger: Logger = new Logger(StaffService.name);

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userService: UserService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly i18n: I18nService<I18nTranslations>,
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

  async findOne(userId: string): Promise<User> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.userNotFound'),
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
