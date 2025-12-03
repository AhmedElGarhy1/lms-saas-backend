import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '@/modules/user/services/user.service';
import { PaginateStudentDto } from '../dto/paginate-student.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class StudentService extends BaseService {
  private readonly logger: Logger = new Logger(StudentService.name);

  constructor(private readonly userService: UserService) {
    super();
  }

  async paginateStudents(params: PaginateStudentDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;
    return this.userService.paginateStudents(params, actor);
  }
}
