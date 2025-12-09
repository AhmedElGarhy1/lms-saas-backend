import { Controller, Get, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiParam } from '@nestjs/swagger';
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
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.student' },
    });
  }

  @Get(':id')
  @ReadApiResponses('Get student by ID')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.STUDENT.READ)
  async getStudent(
    @Param('id', ParseUUIDPipe) userProfileId: string,
    @GetUser() actorUser: ActorUser,
  ) {
    const result = await this.studentService.findOne(
      userProfileId,
      actorUser,
      true, // includeDeleted: true for API endpoints
    );
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.student' },
    });
  }
}
