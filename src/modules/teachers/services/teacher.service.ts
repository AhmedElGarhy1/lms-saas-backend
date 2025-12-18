import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '@/modules/user/services/user.service';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { PaginateTeacherDto } from '../dto/paginate-teacher.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class TeacherService extends BaseService {
  private readonly logger: Logger = new Logger(TeacherService.name);

  constructor(private readonly userService: UserService) {
    super();
  }

  async paginateTeachers(params: PaginateTeacherDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;
    return this.userService.paginateTeachers(params, actor);
  }

  async findOne(
    userProfileId: string,
    actor: ActorUser,
    includeDeleted = false,
  ) {
    // Find user by profileId with same structure as paginate
    const user = await this.userService.findTeacherUserByProfileId(
      userProfileId,
      actor,
      includeDeleted,
    );
    if (!user) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.teacher',
        identifier: 't.resources.identifier',
        value: userProfileId,
      });
    }
    return user;
  }
}
