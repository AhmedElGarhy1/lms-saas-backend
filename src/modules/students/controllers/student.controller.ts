import { Controller, Get, Query, Param } from '@nestjs/common';
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
import { UserProfileIdParamDto } from '@/modules/user-profile/dto/user-profile-id-param.dto';
import { ManagerialOnly } from '@/shared/common/decorators';

@ApiTags('Students')
@Controller('students')
@ManagerialOnly()
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
    return ControllerResponse.success(result);
  }

  @Get(':id')
  @ReadApiResponses('Get student by ID')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @SerializeOptions({ type: UserResponseDto })
  @Permissions(PERMISSIONS.STUDENT.READ)
  async getStudent(
    @Param() params: UserProfileIdParamDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const result = await this.studentService.findOne(
      params.id,
      actorUser,
      true, // includeDeleted: true for API endpoints
    );
    return ControllerResponse.success(result);
  }
}
