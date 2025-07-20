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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { GradeLevelsService } from './grade-levels.service';
import { CreateGradeLevelDto } from './dto/create-grade-level.dto';
import { UpdateGradeLevelDto } from './dto/update-grade-level.dto';
import { AssignStudentDto } from '../shared/dto/assign-student.dto';
import { AssignGroupDto } from './dto/assign-group.dto';
import { AssignSubjectDto } from './dto/assign-subject.dto';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { Roles } from '../access-control/decorators/roles.decorator';
import { RolesGuard } from '../access-control/guards/roles.guard';
import { ContextGuard } from '../access-control/guards/context.guard';
import { GradeLevelDto } from './dto/grade-level.dto';
import { Paginate, PaginateQuery } from 'nestjs-paginate';

// Apply ContextGuard globally to ensure scopeType/scopeId are set
@UseGuards(ContextGuard)
@ApiTags('Grade Levels')
@Controller('grade-levels')
export class GradeLevelsController {
  private readonly logger = new Logger(GradeLevelsController.name);
  constructor(private readonly gradeLevelsService: GradeLevelsService) {}

  // Only Owners/Admins/Teachers can create grade levels
  @Post()
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new grade level' })
  @ApiBody({ type: CreateGradeLevelDto })
  @ApiResponse({ status: 201, description: 'Grade level created' })
  async createGradeLevel(@Body() dto: CreateGradeLevelDto) {
    return this.gradeLevelsService.createGradeLevel(dto);
  }

  // Only Owners/Admins/Teachers can update grade levels
  @Patch(':id')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a grade level' })
  @ApiParam({ name: 'id', description: 'Grade level ID' })
  @ApiBody({ type: UpdateGradeLevelDto })
  @ApiResponse({ status: 200, description: 'Grade level updated' })
  async updateGradeLevel(
    @Param('id') id: string,
    @Body() dto: UpdateGradeLevelDto,
  ) {
    return this.gradeLevelsService.updateGradeLevel(id, dto);
  }

  // Only Owners/Admins can delete grade levels
  @Delete(':id')
  @Roles('Admin', 'Owner')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a grade level' })
  @ApiParam({ name: 'id', description: 'Grade level ID' })
  @ApiResponse({ status: 200, description: 'Grade level deleted' })
  async deleteGradeLevel(@Param('id') id: string) {
    return this.gradeLevelsService.deleteGradeLevel(id);
  }

  // Any member can view a grade level
  @Get(':id')
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get grade level by ID' })
  @ApiParam({ name: 'id', description: 'Grade level ID' })
  @ApiResponse({ status: 200, description: 'Grade level found' })
  async getGradeLevelById(@Param('id') id: string) {
    return this.gradeLevelsService.getGradeLevelById(id);
  }

  // Any member can list grade levels
  @Get()
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List grade levels (global or by center)' })
  @ApiResponse({
    status: 200,
    description: 'List of grade levels',
    type: GradeLevelDto,
    isArray: true,
  })
  async listGradeLevels(@Paginate() query: PaginateQuery) {
    return this.gradeLevelsService.listGradeLevels(query);
  }

  // Assignment management - Only Owners/Admins/Teachers can assign students
  @Post(':gradeLevelId/students')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Assign a student to a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiBody({ type: AssignStudentDto })
  @ApiResponse({ status: 201, description: 'Student assigned' })
  async assignStudent(
    @Param('gradeLevelId') gradeLevelId: string,
    @Body() dto: AssignStudentDto,
  ) {
    return this.gradeLevelsService.assignStudent(gradeLevelId, dto);
  }

  @Delete(':gradeLevelId/students/:studentId')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Unassign a student from a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student unassigned' })
  async unassignStudent(
    @Param('gradeLevelId') gradeLevelId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.gradeLevelsService.unassignStudent(gradeLevelId, studentId);
  }

  // Assignment management - Only Owners/Admins/Teachers can assign groups
  @Post(':gradeLevelId/groups')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Assign a group to a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiBody({ type: AssignGroupDto })
  @ApiResponse({ status: 201, description: 'Group assigned' })
  async assignGroup(
    @Param('gradeLevelId') gradeLevelId: string,
    @Body() dto: AssignGroupDto,
  ) {
    return this.gradeLevelsService.assignGroup(gradeLevelId, dto);
  }

  @Delete(':gradeLevelId/groups/:groupId')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Unassign a group from a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group unassigned' })
  async unassignGroup(
    @Param('gradeLevelId') gradeLevelId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.gradeLevelsService.unassignGroup(gradeLevelId, groupId);
  }

  // Assignment management - Only Owners/Admins/Teachers can assign subjects
  @Post(':gradeLevelId/subjects')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Assign a subject to a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiBody({ type: AssignSubjectDto })
  @ApiResponse({ status: 201, description: 'Subject assigned' })
  async assignSubject(
    @Param('gradeLevelId') gradeLevelId: string,
    @Body() dto: AssignSubjectDto,
  ) {
    return this.gradeLevelsService.assignSubject(gradeLevelId, dto);
  }

  @Delete(':gradeLevelId/subjects/:subjectId')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Unassign a subject from a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject unassigned' })
  async unassignSubject(
    @Param('gradeLevelId') gradeLevelId: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.gradeLevelsService.unassignSubject(gradeLevelId, subjectId);
  }

  // List assignments - Any member can view
  @Get(':gradeLevelId/students')
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List students in a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiResponse({ status: 200, description: 'List of students' })
  async listStudents(@Param('gradeLevelId') gradeLevelId: string) {
    return this.gradeLevelsService.listStudents(gradeLevelId);
  }

  @Get(':gradeLevelId/groups')
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List groups in a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiResponse({ status: 200, description: 'List of groups' })
  async listGroups(@Param('gradeLevelId') gradeLevelId: string) {
    return this.gradeLevelsService.listGroups(gradeLevelId);
  }

  @Get(':gradeLevelId/subjects')
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List subjects in a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiResponse({ status: 200, description: 'List of subjects' })
  async listSubjects(@Param('gradeLevelId') gradeLevelId: string) {
    return this.gradeLevelsService.listSubjects(gradeLevelId);
  }
}
