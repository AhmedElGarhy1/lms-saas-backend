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
import { GroupsService } from './groups.service';
import {
  CreateGroupRequestSchema,
  CreateGroupRequestDto,
  CreateGroupRequest,
} from './dto/create-group.dto';
import {
  UpdateGroupRequestSchema,
  UpdateGroupRequestDto,
  UpdateGroupRequest,
} from './dto/update-group.dto';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { ContextGuard } from '../access-control/guards/context.guard';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import {
  AssignStudentRequestSchema,
  AssignStudentRequestDto,
  AssignStudentRequest,
} from './dto/assign-student.dto';
import {
  AssignTeacherRequestSchema,
  AssignTeacherRequestDto,
  AssignTeacherRequest,
} from './dto/assign-teacher.dto';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';

// Apply ContextGuard globally to ensure scopeType/scopeId are set
@UseGuards(ContextGuard)
@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  private readonly logger = new Logger(GroupsController.name);
  constructor(private readonly groupsService: GroupsService) {}

  // Only Owners/Admins/Teachers can create groups
  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiBody({ type: CreateGroupRequestDto })
  @ApiResponse({ status: 201, description: 'Group created' })
  async createGroup(
    @Body(new ZodValidationPipe(CreateGroupRequestSchema))
    dto: CreateGroupRequest,
  ) {
    return this.groupsService.createGroup(dto);
  }

  // Only Owners/Admins/Teachers can update groups
  @Patch(':id')
  @ApiOperation({ summary: 'Update a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: UpdateGroupRequestDto })
  @ApiResponse({ status: 200, description: 'Group updated' })
  async updateGroup(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateGroupRequestSchema))
    dto: UpdateGroupRequest,
  ) {
    return this.groupsService.updateGroup(id, dto);
  }

  // Only Owners/Admins can delete groups
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group deleted' })
  async deleteGroup(@Param('id') id: string) {
    return this.groupsService.deleteGroup(id);
  }

  // Any member can view a group
  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group found' })
  async getGroupById(@Param('id') id: string) {
    return this.groupsService.getGroupById(id);
  }

  // Any member can list groups
  @Get()
  @ApiOperation({ summary: 'List groups (with optional filtering)' })
  @ApiResponse({
    status: 200,
    description: 'List of groups',
  })
  async listGroups(
    @Paginate() query: PaginateQuery,
    @GetUser() user: CurrentUserType,
  ) {
    return this.groupsService.listGroups(query, user.id);
  }

  // Assignment management - Only Owners/Admins/Teachers can assign students
  @Post(':id/assign-student')
  @ApiOperation({ summary: 'Assign a student to a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: AssignStudentRequestDto })
  @ApiResponse({ status: 200, description: 'Student assigned' })
  async assignStudent(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignStudentRequestSchema))
    dto: AssignStudentRequest,
  ) {
    return this.groupsService.assignStudent(id, dto.studentId);
  }

  @Delete(':groupId/students/:studentId')
  @ApiOperation({ summary: 'Unassign a student from a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student unassigned' })
  async unassignStudent(
    @Param('groupId') groupId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.groupsService.unassignStudent(groupId, studentId);
  }

  // Assignment management - Only Owners/Admins/Teachers can assign teachers
  @Post(':id/assign-teacher')
  @ApiOperation({ summary: 'Assign a teacher to a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: AssignTeacherRequestDto })
  @ApiResponse({ status: 200, description: 'Teacher assigned' })
  async assignTeacher(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignTeacherRequestSchema))
    dto: AssignTeacherRequest,
  ) {
    return this.groupsService.assignTeacher(id, dto.teacherId);
  }

  @Delete(':groupId/teachers/:teacherId')
  @ApiOperation({ summary: 'Unassign a teacher from a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Teacher unassigned' })
  async unassignTeacher(
    @Param('groupId') groupId: string,
    @Param('teacherId') teacherId: string,
  ) {
    return this.groupsService.unassignTeacher(groupId, teacherId);
  }

  // List assignments - Any member can view
  @Get(':groupId/students')
  @ApiOperation({ summary: 'List students in a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'List of students' })
  async listStudents(@Param('groupId') groupId: string) {
    return this.groupsService.listStudents(groupId);
  }

  @Get(':groupId/teachers')
  @ApiOperation({ summary: 'List teachers in a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'List of teachers' })
  async listTeachers(@Param('groupId') groupId: string) {
    return this.groupsService.listTeachers(groupId);
  }
}
