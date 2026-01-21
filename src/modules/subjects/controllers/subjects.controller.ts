import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { SubjectsService } from '../services/subjects.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { PaginateSubjectsDto } from '../dto/paginate-subjects.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser, ManagerialOnly } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { SerializeOptions } from '@nestjs/common';
import { SubjectResponseDto } from '../dto/subject-response.dto';
import { SubjectIdParamDto } from '../dto/subject-id-param.dto';
import { DeletedSubjectIdParamDto } from '../dto/deleted-subject-id-param.dto';

@ApiTags('Subjects')
@Controller('subjects')
@ManagerialOnly()
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all subjects for a center with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Subjects retrieved successfully',
  })
  @Permissions(PERMISSIONS.SUBJECTS.READ)
  @SerializeOptions({ type: SubjectResponseDto })
  async paginateSubjects(
    @Query() paginateDto: PaginateSubjectsDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.subjectsService.paginateSubjects(
      paginateDto,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Get(':subjectId')
  @ApiOperation({ summary: 'Get a specific subject' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({
    status: 200,
    description: 'Subject retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Subject not found',
  })
  @Permissions(PERMISSIONS.SUBJECTS.READ)
  @SerializeOptions({ type: SubjectResponseDto })
  async getSubject(
    @Param() params: SubjectIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.subjectsService.getSubject(
      params.subjectId,
      actor,
      true,
    ); // includeDeleted: true for API endpoints
    return ControllerResponse.success(result);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiResponse({
    status: 201,
    description: 'Subject created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @Permissions(PERMISSIONS.SUBJECTS.CREATE)
  @Transactional()
  @SerializeOptions({ type: SubjectResponseDto })
  async createSubject(
    @Body() createSubjectDto: CreateSubjectDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.subjectsService.createSubject(
      createSubjectDto,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Put(':subjectId')
  @ApiOperation({ summary: 'Update a subject' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({
    status: 200,
    description: 'Subject updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Subject not found',
  })
  @Permissions(PERMISSIONS.SUBJECTS.UPDATE)
  @Transactional()
  @SerializeOptions({ type: SubjectResponseDto })
  async updateSubject(
    @Param() params: SubjectIdParamDto,
    @Body() data: UpdateSubjectDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.subjectsService.updateSubject(
      params.subjectId,
      data,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Delete(':subjectId')
  @ApiOperation({ summary: 'Delete a subject' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({
    status: 200,
    description: 'Subject deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Subject not found',
  })
  @Permissions(PERMISSIONS.SUBJECTS.DELETE)
  @Transactional()
  async deleteSubject(
    @Param() params: SubjectIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.subjectsService.deleteSubject(params.subjectId, actor);
    return ControllerResponse.success(null);
  }

  @Patch(':subjectId/restore')
  @UpdateApiResponses('Restore deleted subject')
  @ApiParam({
    name: 'subjectId',
    description: 'Subject ID',
    type: String,
  })
  @Permissions(PERMISSIONS.SUBJECTS.RESTORE)
  @Transactional()
  @SerializeOptions({ type: SubjectResponseDto })
  async restoreSubject(
    @Param() params: DeletedSubjectIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.subjectsService.restoreSubject(params.subjectId, actor);
    return ControllerResponse.success(null);
  }
}
