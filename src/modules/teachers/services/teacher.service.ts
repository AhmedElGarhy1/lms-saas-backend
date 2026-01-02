import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '@/modules/user/services/user.service';
import { TeachersErrors } from '../exceptions/teachers.errors';
import { PaginateTeacherDto } from '../dto/paginate-teacher.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseService } from '@/shared/common/services/base.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';

@Injectable()
export class TeacherService extends BaseService {
  private readonly logger: Logger = new Logger(TeacherService.name);

  constructor(
    private readonly userService: UserService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super();
  }

  async paginateTeachers(params: PaginateTeacherDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;

    // Validate access to staffProfileId if provided as filter
    if (params.staffProfileId) {
      // Validate actor has user access to staffProfileId (optional centerId)
      await this.accessControlHelperService.validateUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: params.staffProfileId,
        centerId: centerId, // Optional - can be undefined
      });

      // If centerId is available, validate that staffProfileId has center access
      if (centerId) {
        await this.accessControlHelperService.validateCenterAccess({
          userProfileId: params.staffProfileId,
          centerId: centerId,
        });
      }
    }

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
      throw TeachersErrors.teacherNotFound();
    }
    return user;
  }
}
