import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Logger,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectRequestDto } from './dto/create-subject.dto';
import { UpdateSubjectRequestDto } from './dto/update-subject.dto';
import { AssignTeacherRequestDto } from './dto/assign-teacher.dto';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { ContextGuard } from '../access-control/guards/context.guard';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { SubjectResponseDto } from './dto/subject.dto';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';
import { PaginationDocs } from '../shared/decorators/pagination-docs.decorator';
import { CreateSubjectResponseDto } from './dto/subject-response.dto';
import { UpdateSubjectResponseDto } from './dto/subject-response.dto';
import { AssignTeacherResponseDto } from './dto/subject-response.dto';

// Apply ContextGuard globally to ensure scopeType/scopeId are set
@UseGuards(ContextGuard)
@ApiTags('Subjects')
@Controller('subjects')
export class SubjectsController {
  private readonly logger = new Logger(SubjectsController.name);
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiResponse({
    status: 201,
    description: 'Subject created successfully',
    type: CreateSubjectResponseDto,
  })
  @ApiBody({ type: CreateSubjectRequestDto })
  async createSubject(
    @Body() dto: CreateSubjectRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
    return this.subjectsService.createSubject(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subject' })
  @ApiResponse({
    status: 200,
    description: 'Subject updated successfully',
    type: UpdateSubjectResponseDto,
  })
  @ApiBody({ type: UpdateSubjectRequestDto })
  async updateSubject(
    @Param('id') id: string,
    @Body() dto: UpdateSubjectRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
    return this.subjectsService.updateSubject(id, dto, user.id);
  }

  // Only Owners/Admins can delete subjects
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subject' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject deleted' })
  async deleteSubject(@Param('id') id: string) {
    return this.subjectsService.deleteSubject(id);
  }

  // Any member can view a subject
  @Get(':id')
  @ApiOperation({ summary: 'Get subject by ID' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject found' })
  async getSubjectById(@Param('id') id: string) {
    return this.subjectsService.getSubjectById(id);
  }

  // Any member can list subjects
  @Get()
  @PaginationDocs({
    searchFields: ['name'],
    exactFields: ['centerId', 'gradeLevelId'],
  })
  @ApiOperation({ summary: 'List subjects (with optional filtering)' })
  @ApiResponse({
    status: 200,
    description: 'List of subjects',
    type: SubjectResponseDto,
    isArray: true,
  })
  async listSubjects(
    @Paginate() query: PaginateQuery,
    @GetUser() user: CurrentUserType,
  ) {
    return this.subjectsService.listSubjects(query, user.id);
  }

  @Post(':id/assign-teacher')
  @ApiOperation({ summary: 'Assign a teacher to a subject' })
  @ApiResponse({
    status: 200,
    description: 'Teacher assigned successfully',
    type: AssignTeacherResponseDto,
  })
  @ApiBody({ type: AssignTeacherRequestDto })
  async assignTeacher(
    @Param('id') id: string,
    @Body() dto: AssignTeacherRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
    return this.subjectsService.assignTeacher(id, dto.teacherId, user.id);
  }

  @Delete(':subjectId/teachers/:teacherId')
  @ApiOperation({ summary: 'Unassign a teacher from a subject' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Teacher unassigned' })
  async unassignTeacher(
    @Param('subjectId') subjectId: string,
    @Param('teacherId') teacherId: string,
  ) {
    return this.subjectsService.unassignTeacher(subjectId, teacherId);
  }

  // List assignments - Any member can view
  @Get(':subjectId/teachers')
  @ApiOperation({ summary: 'List teachers for a subject' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'List of teachers' })
  async listTeachers(@Param('subjectId') subjectId: string) {
    return this.subjectsService.listTeachers(subjectId);
  }
}
