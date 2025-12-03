import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '@/modules/user/services/user.service';
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
}
