import {
  Controller,
  Logger,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { Roles } from '../access-control/decorators/roles.decorator';
import { RolesGuard } from '../access-control/guards/roles.guard';
import { ContextGuard } from '../access-control/guards/context.guard';
import { SubjectDto } from './dto/subject.dto';

// Apply ContextGuard globally to ensure scopeType/scopeId are set
@UseGuards(ContextGuard)
@ApiTags('Subjects')
@Controller('subjects')
export class SubjectsController {
  private readonly logger = new Logger(SubjectsController.name);
  constructor(private readonly subjectsService: SubjectsService) {}

  // Only Owners/Admins/Teachers can create subjects
  @Post()
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiBody({ type: CreateSubjectDto })
  @ApiResponse({ status: 201, description: 'Subject created' })
  async createSubject(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.createSubject(dto);
  }

  // Only Owners/Admins/Teachers can update subjects
  @Patch(':id')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a subject' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiBody({ type: UpdateSubjectDto })
  @ApiResponse({ status: 200, description: 'Subject updated' })
  async updateSubject(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.updateSubject(id, dto);
  }

  // Only Owners/Admins can delete subjects
  @Delete(':id')
  @Roles('Admin', 'Owner')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a subject' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject deleted' })
  async deleteSubject(@Param('id') id: string) {
    return this.subjectsService.deleteSubject(id);
  }

  // Any member can view a subject
  @Get(':id')
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get subject by ID' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject found' })
  async getSubjectById(@Param('id') id: string) {
    return this.subjectsService.getSubjectById(id);
  }

  // Any member can list subjects
  @Get()
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List subjects (with optional filtering)' })
  @ApiQuery({
    name: 'centerId',
    required: false,
    description: 'Center ID to filter by',
  })
  @ApiQuery({
    name: 'gradeLevelId',
    required: false,
    description: 'Grade level ID to filter by',
  })
  @ApiResponse({
    status: 200,
    description: 'List of subjects',
    type: SubjectDto,
    isArray: true,
  })
  async listSubjects(
    @Query('centerId') centerId?: string,
    @Query('gradeLevelId') gradeLevelId?: string,
  ) {
    return this.subjectsService.listSubjects(centerId, gradeLevelId);
  }

  // Assignment management - Only Owners/Admins/Teachers can assign teachers
  @Post(':subjectId/teachers')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Assign a teacher to a subject' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiBody({ type: AssignTeacherDto })
  @ApiResponse({ status: 201, description: 'Teacher assigned' })
  async assignTeacher(
    @Param('subjectId') subjectId: string,
    @Body() dto: AssignTeacherDto,
  ) {
    return this.subjectsService.assignTeacher(subjectId, dto);
  }

  @Delete(':subjectId/teachers/:teacherId')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
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
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List teachers for a subject' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'List of teachers' })
  async listTeachers(@Param('subjectId') subjectId: string) {
    return this.subjectsService.listTeachers(subjectId);
  }
}
