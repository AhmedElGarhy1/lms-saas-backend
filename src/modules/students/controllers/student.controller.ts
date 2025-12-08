import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReadApiResponses } from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { PaginateStudentDto } from '../dto/paginate-student.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { StudentService } from '../services/student.service';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiTags('Students')
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @ReadApiResponses('List students with pagination and filtering')
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.STUDENT.READ)
  async paginateStudents(
    @Query() query: PaginateStudentDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const result = await this.studentService.paginateStudents(query, actorUser);
    // Wrap in ControllerResponse for consistent messaging
    return ControllerResponse.success(result, 't.messages.found', {
      resource: 't.resources.student',
    });
  }
}
