import {
  Controller,
  Logger,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CentersService } from './centers.service';
import {
  CreateCenterRequestSchema,
  CreateCenterRequestDto,
} from './dto/create-center.dto';
import {
  UpdateCenterRequestSchema,
  UpdateCenterRequestDto,
} from './dto/update-center.dto';
import {
  AddMemberRequestSchema,
  AddMemberRequestDto,
} from './dto/add-member.dto';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { ContextGuard } from '../access-control/guards/context.guard';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import {
  ChangeMemberRoleRequestSchema,
  ChangeMemberRoleRequestDto,
} from './dto/change-member-role.dto';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';

// Apply ContextGuard globally to ensure scopeType/scopeId are set
@UseGuards(ContextGuard)
@ApiTags('Centers')
@Controller('centers')
export class CentersController {
  private readonly logger = new Logger(CentersController.name);

  constructor(private readonly centersService: CentersService) {}

  // Only Admins/Owners can create a center
  @Post()
  @ApiOperation({ summary: 'Create a new center' })
  @ApiBody({ type: CreateCenterRequestDto })
  @ApiResponse({ status: 201, description: 'Center created' })
  async createCenter(
    @Body(new ZodValidationPipe(CreateCenterRequestSchema))
    dto: CreateCenterRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
    if (!user?.id) throw new BadRequestException('Missing user context');
    return this.centersService.createCenter({ ...dto, ownerId: user.id });
  }

  // Only members (any role) can view a center
  @Get(':id')
  @ApiOperation({ summary: 'Get center by ID' })
  @ApiParam({ name: 'id', description: 'Center ID' })
  @ApiResponse({ status: 200, description: 'Center found' })
  async getCenterById(@Param('id') id: string) {
    return this.centersService.getCenterById(id);
  }

  // Only Admins/Owners can update a center
  @Patch(':id')
  @ApiOperation({ summary: 'Update a center' })
  @ApiParam({ name: 'id', description: 'Center ID' })
  @ApiBody({ type: UpdateCenterRequestDto })
  @ApiResponse({ status: 200, description: 'Center updated' })
  async updateCenter(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCenterRequestSchema))
    dto: UpdateCenterRequestDto,
  ) {
    return this.centersService.updateCenter(id, dto);
  }

  // Only Owners can delete a center (soft delete)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a center' })
  @ApiParam({ name: 'id', description: 'Center ID' })
  @ApiResponse({ status: 200, description: 'Center soft deleted' })
  async softDeleteCenter(@Param('id') id: string) {
    return this.centersService.softDeleteCenter(id);
  }

  // List centers for current user (no role restriction, handled in service)
  @Get()
  @ApiOperation({ summary: 'List centers for current user' })
  @ApiResponse({ status: 200, description: 'List of centers' })
  async listCentersForUser(
    @Paginate() query: PaginateQuery,
    @GetUser() user: CurrentUserType,
  ) {
    if (!user?.id) throw new BadRequestException('Missing user context');
    return this.centersService.listCentersForUser(user.id, query);
  }

  // Member management
  // Only Admins/Owners can add a member
  @Post(':centerId/members')
  @ApiOperation({ summary: 'Add a member to a center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiBody({ type: AddMemberRequestDto })
  @ApiResponse({ status: 201, description: 'Member added' })
  async addMember(
    @Param('centerId') centerId: string,
    @Body(new ZodValidationPipe(AddMemberRequestSchema))
    dto: AddMemberRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
    return this.centersService.addMember(centerId, {
      ...dto,
      createdBy: user.id,
    });
  }

  // Only Admins/Owners can remove a member
  @Delete(':centerId/members/:userId')
  @ApiOperation({ summary: 'Remove a member from a center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @Param('centerId') centerId: string,
    @Param('userId') userId: string,
  ) {
    return this.centersService.removeMember(centerId, userId);
  }

  // Only Admins/Owners can change a member's role
  @Patch(':centerId/members/:userId/role')
  @ApiOperation({ summary: "Change a member's role in a center" })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: ChangeMemberRoleRequestDto })
  @ApiResponse({ status: 200, description: 'Member role changed' })
  async changeMemberRole(
    @Param('centerId') centerId: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(ChangeMemberRoleRequestSchema))
    dto: ChangeMemberRoleRequestDto,
  ) {
    return this.centersService.changeMemberRole(centerId, userId, dto.role);
  }

  // Any member can list members
  @Get(':centerId/members')
  @ApiOperation({ summary: 'List members of a center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiResponse({
    status: 200,
    description: 'List of members',
  })
  async listMembers(@Param('centerId') centerId: string) {
    return this.centersService.listMembers(centerId);
  }

  // Any member can filter members by role
  @Get(':centerId/members/role/:role')
  @ApiOperation({ summary: 'Filter members by role in a center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiParam({ name: 'role', description: 'Role name' })
  @ApiResponse({
    status: 200,
    description: 'List of members with given role',
  })
  async filterMembersByRole(
    @Param('centerId') centerId: string,
    @Param('role') role: string,
  ) {
    return this.centersService.filterMembersByRole(centerId, role);
  }

  // Get default roles for a center
  @Get(':centerId/roles/default')
  @ApiOperation({ summary: 'Get default roles for a center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiResponse({
    status: 200,
    description: 'Default roles for the center',
  })
  async getDefaultRoles(@Param('centerId') centerId: string) {
    return this.centersService.getDefaultRoles(centerId);
  }

  // Assign a user as a teacher (creates teacher record)
  @Post(':centerId/members/:userId/assign-teacher')
  @ApiOperation({ summary: 'Assign a user as a teacher in the center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 201,
    description: 'User assigned as teacher',
  })
  async assignAsTeacher(
    @Param('centerId') centerId: string,
    @Param('userId') userId: string,
    @GetUser() user: CurrentUserType,
  ) {
    if (!user?.id) throw new BadRequestException('Missing user context');
    return this.centersService.assignAsTeacher(centerId, userId, user.id);
  }

  // Assign a user as a student (creates student record)
  @Post(':centerId/members/:userId/assign-student')
  @ApiOperation({ summary: 'Assign a user as a student in the center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 201,
    description: 'User assigned as student',
  })
  async assignAsStudent(
    @Param('centerId') centerId: string,
    @Param('userId') userId: string,
    @GetUser() user: CurrentUserType,
  ) {
    if (!user?.id) throw new BadRequestException('Missing user context');
    return this.centersService.assignAsStudent(centerId, userId, user.id);
  }

  // List accessible members for current user in a center
  @Get(':centerId/members/accessible')
  @ApiOperation({
    summary: 'List members of a center the current user can access',
  })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiResponse({
    status: 200,
    description: 'List of accessible members',
  })
  async listAccessibleMembers(
    @Param('centerId') centerId: string,
    @GetUser() user: CurrentUserType,
  ) {
    if (!user?.id) throw new BadRequestException('Missing user context');
    return this.centersService.listAccessibleMembers(centerId, user.id);
  }
}
