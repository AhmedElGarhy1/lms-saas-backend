import { Injectable, Logger } from '@nestjs/common';
import { StaffRepository } from '../repositories/staff.repository';
import { UserService } from '@/modules/user/services/user.service';
import { PaginateStaffDto } from '../dto/paginate-staff.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class StaffService extends BaseService {
  private readonly logger: Logger = new Logger(StaffService.name);

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userService: UserService,
  ) {
    super();
  }

  async paginateStaff(params: PaginateStaffDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;
    return this.userService.paginateStaff(params, actor);
  }

  async findOne(
    userProfileId: string,
    actor: ActorUser,
    includeDeleted = false,
  ) {
    // Find user by profileId with same structure as paginate
    const user = await this.userService.findStaffUserByProfileId(
      userProfileId,
      actor,
      includeDeleted,
    );
    if (!user) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.staff',
        identifier: 't.resources.identifier',
        value: userProfileId,
      });
    }
    return user;
  }
}
