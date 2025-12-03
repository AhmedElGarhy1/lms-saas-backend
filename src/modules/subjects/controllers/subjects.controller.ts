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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { SubjectsService } from '../services/subjects.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { PaginateSubjectsDto } from '../dto/paginate-subjects.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { SerializeOptions } from '@nestjs/common';
import { SubjectResponseDto } from '../dto/subject-response.dto';

@ApiTags('Subjects')
@Controller('subjects')
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
    return ControllerResponse.success(result, 't.success.dataRetrieved');
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
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.subjectsService.getSubject(subjectId, actor);
    return ControllerResponse.success(result, 't.success.dataRetrieved');
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
    return ControllerResponse.success(result, 't.success.create', {
      resource: 't.common.resources.subject',
    });
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
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Body() data: UpdateSubjectDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.subjectsService.updateSubject(
      subjectId,
      data,
      actor,
    );
    return ControllerResponse.success(result, 't.success.update', {
      resource: 't.common.resources.subject',
    });
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
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @GetUser() actor: ActorUser,
  ) {
    await this.subjectsService.deleteSubject(subjectId, actor);
    return ControllerResponse.message('t.success.delete', {
      resource: 't.common.resources.subject',
    });
  }

  @Patch(':subjectId/restore')
  @UpdateApiResponses('Restore deleted subject')
  @ApiParam({ name: 'subjectId', description: 'Subject ID', type: String })
  @Permissions(PERMISSIONS.SUBJECTS.RESTORE)
  @Transactional()
  @SerializeOptions({ type: SubjectResponseDto })
  async restoreSubject(
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @GetUser() actor: ActorUser,
  ) {
    await this.subjectsService.restoreSubject(subjectId, actor);
    return ControllerResponse.message('t.success.restore', {
      resource: 't.common.resources.subject',
    });
  }
}
