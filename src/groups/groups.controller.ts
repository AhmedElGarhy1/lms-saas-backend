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
import { CreateGroupRequestDto } from './dto/create-group.dto';
import { UpdateGroupRequestDto } from './dto/update-group.dto';
import { AssignStudentRequestDto } from './dto/assign-student.dto';
import { AssignTeacherRequestDto } from './dto/assign-teacher.dto';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';
import { PaginationDocs } from '../shared/decorators/pagination-docs.decorator';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { ContextGuard } from '../access-control/guards/context.guard';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { CreateGroupResponseDto } from './dto/group-response.dto';
import { UpdateGroupResponseDto } from './dto/group-response.dto';
import { AssignStudentResponseDto } from './dto/group-response.dto';
import { AssignTeacherResponseDto } from './dto/group-response.dto';

// Apply ContextGuard globally to ensure scopeType/scopeId are set
@UseGuards(ContextGuard)
@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  private readonly logger = new Logger(GroupsController.name);
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: CreateGroupResponseDto,
  })
  @ApiBody({ type: CreateGroupRequestDto })
  async createGroup(
    @Body() dto: CreateGroupRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
    return this.groupsService.createGroup(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a group' })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
    type: UpdateGroupResponseDto,
  })
  @ApiBody({ type: UpdateGroupRequestDto })
  async updateGroup(
    @Param('id') id: string,
    @Body() dto: UpdateGroupRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
    return this.groupsService.updateGroup(id, dto, user.id);
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
  @PaginationDocs({
    searchFields: ['name'],
    exactFields: ['centerId', 'gradeLevelId'],
  })
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

  @Post(':id/assign-student')
  @ApiOperation({ summary: 'Assign a student to a group' })
  @ApiResponse({
    status: 200,
    description: 'Student assigned successfully',
    type: AssignStudentResponseDto,
  })
  @ApiBody({ type: AssignStudentRequestDto })
  async assignStudent(
    @Param('id') id: string,
    @Body() dto: AssignStudentRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
    return this.groupsService.assignStudent(id, dto.studentId, user.id);
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

  @Post(':id/assign-teacher')
  @ApiOperation({ summary: 'Assign a teacher to a group' })
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
    return this.groupsService.assignTeacher(id, dto.teacherId, user.id);
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
