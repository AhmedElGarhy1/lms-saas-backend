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
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AssignStudentDto } from './dto/assign-student.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { Roles } from '../access-control/decorators/roles.decorator';
import { RolesGuard } from '../access-control/guards/roles.guard';
import { ContextGuard } from '../access-control/guards/context.guard';
import { GroupDto } from './dto/group.dto';

// Apply ContextGuard globally to ensure scopeType/scopeId are set
@UseGuards(ContextGuard)
@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  private readonly logger = new Logger(GroupsController.name);
  constructor(private readonly groupsService: GroupsService) {}

  // Only Owners/Admins/Teachers can create groups
  @Post()
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new group' })
  @ApiBody({ type: CreateGroupDto })
  @ApiResponse({ status: 201, description: 'Group created' })
  async createGroup(@Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(dto);
  }

  // Only Owners/Admins/Teachers can update groups
  @Patch(':id')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: UpdateGroupDto })
  @ApiResponse({ status: 200, description: 'Group updated' })
  async updateGroup(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.updateGroup(id, dto);
  }

  // Only Owners/Admins can delete groups
  @Delete(':id')
  @Roles('Admin', 'Owner')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group deleted' })
  async deleteGroup(@Param('id') id: string) {
    return this.groupsService.deleteGroup(id);
  }

  // Any member can view a group
  @Get(':id')
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group found' })
  async getGroupById(@Param('id') id: string) {
    return this.groupsService.getGroupById(id);
  }

  // Any member can list groups
  @Get()
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List groups (with optional filtering)' })
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
    description: 'List of groups',
    type: GroupDto,
    isArray: true,
  })
  async listGroups(
    @Query('centerId') centerId?: string,
    @Query('gradeLevelId') gradeLevelId?: string,
  ) {
    return this.groupsService.listGroups(centerId, gradeLevelId);
  }

  // Assignment management - Only Owners/Admins/Teachers can assign students
  @Post(':groupId/students')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Assign a student to a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiBody({ type: AssignStudentDto })
  @ApiResponse({ status: 201, description: 'Student assigned' })
  async assignStudent(
    @Param('groupId') groupId: string,
    @Body() dto: AssignStudentDto,
  ) {
    return this.groupsService.assignStudent(groupId, dto);
  }

  @Delete(':groupId/students/:studentId')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
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
  @Post(':groupId/teachers')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Assign a teacher to a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiBody({ type: AssignTeacherDto })
  @ApiResponse({ status: 201, description: 'Teacher assigned' })
  async assignTeacher(
    @Param('groupId') groupId: string,
    @Body() dto: AssignTeacherDto,
  ) {
    return this.groupsService.assignTeacher(groupId, dto);
  }

  @Delete(':groupId/teachers/:teacherId')
  @Roles('Admin', 'Owner', 'Teacher')
  @UseGuards(RolesGuard)
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
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List students in a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'List of students' })
  async listStudents(@Param('groupId') groupId: string) {
    return this.groupsService.listStudents(groupId);
  }

  @Get(':groupId/teachers')
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List teachers in a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'List of teachers' })
  async listTeachers(@Param('groupId') groupId: string) {
    return this.groupsService.listTeachers(groupId);
  }
}
