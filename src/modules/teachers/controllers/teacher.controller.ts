import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReadApiResponses } from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { PaginateTeacherDto } from '../dto/paginate-teacher.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { TeacherService } from '../services/teacher.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiTags('Teachers')
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get()
  @ReadApiResponses('List teachers with pagination and filtering')
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.TEACHER.READ)
  async paginateTeachers(
    @Query() query: PaginateTeacherDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const result = await this.teacherService.paginateTeachers(query, actorUser);
    // Wrap in ControllerResponse for consistent messaging
    return ControllerResponse.success(result, 't.messages.found', {
      resource: 't.resources.teacher',
    });
  }
}
