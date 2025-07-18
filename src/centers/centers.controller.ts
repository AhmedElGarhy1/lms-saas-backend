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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CentersService } from './centers.service';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ChangeMemberRoleDto } from './dto/change-member-role.dto';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { UseGuards } from '@nestjs/common';
import { Roles } from '../access-control/decorators/roles.decorator';
import { RolesGuard } from '../access-control/guards/roles.guard';
import { ContextGuard } from '../access-control/guards/context.guard';
import { MemberDto } from './dto/member.dto';

// Apply ContextGuard globally to ensure scopeType/scopeId are set
@UseGuards(ContextGuard)
@ApiTags('Centers')
@Controller('centers')
export class CentersController {
  private readonly logger = new Logger(CentersController.name);

  constructor(private readonly centersService: CentersService) {}

  // Only Admins/Owners can create a center
  @Post()
  @Roles('Admin', 'Owner')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new center' })
  @ApiBody({ type: CreateCenterDto })
  @ApiResponse({ status: 201, description: 'Center created' })
  async createCenter(
    @Body() dto: CreateCenterDto,
    @GetUser() user: CurrentUserType,
  ) {
    if (!user?.id) throw new BadRequestException('Missing user context');
    return this.centersService.createCenter({ ...dto, ownerId: user.id });
  }

  // Only members (any role) can view a center
  @Get(':id')
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get center by ID' })
  @ApiParam({ name: 'id', description: 'Center ID' })
  @ApiResponse({ status: 200, description: 'Center found' })
  async getCenterById(@Param('id') id: string) {
    return this.centersService.getCenterById(id);
  }

  // Only Admins/Owners can update a center
  @Patch(':id')
  @Roles('Admin', 'Owner')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a center' })
  @ApiParam({ name: 'id', description: 'Center ID' })
  @ApiBody({ type: UpdateCenterDto })
  @ApiResponse({ status: 200, description: 'Center updated' })
  async updateCenter(@Param('id') id: string, @Body() dto: UpdateCenterDto) {
    return this.centersService.updateCenter(id, dto);
  }

  // Only Owners can delete a center (soft delete)
  @Delete(':id')
  @Roles('Owner')
  @UseGuards(RolesGuard)
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
  async listCentersForUser(@GetUser() user: CurrentUserType) {
    if (!user?.id) throw new BadRequestException('Missing user context');
    return this.centersService.listCentersForUser(user.id);
  }

  // Member management
  // Only Admins/Owners can add a member
  @Post(':centerId/members')
  @Roles('Admin', 'Owner')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Add a member to a center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiBody({ type: AddMemberDto })
  @ApiResponse({ status: 201, description: 'Member added' })
  async addMember(
    @Param('centerId') centerId: string,
    @Body() dto: AddMemberDto,
    @GetUser() user: CurrentUserType,
  ) {
    if (!user?.id) throw new BadRequestException('Missing user context');
    return this.centersService.addMember(centerId, {
      ...dto,
      createdBy: user.id,
    });
  }

  // Only Admins/Owners can remove a member
  @Delete(':centerId/members/:userId')
  @Roles('Admin', 'Owner')
  @UseGuards(RolesGuard)
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
  @Roles('Admin', 'Owner')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Change a member's role in a center" })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: ChangeMemberRoleDto })
  @ApiResponse({ status: 200, description: 'Member role changed' })
  async changeMemberRole(
    @Param('centerId') centerId: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.centersService.changeMemberRole(centerId, userId, dto);
  }

  // Any member can list members
  @Get(':centerId/members')
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List members of a center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiResponse({
    status: 200,
    description: 'List of members',
    type: MemberDto,
    isArray: true,
  })
  async listMembers(@Param('centerId') centerId: string) {
    return this.centersService.listMembers(centerId);
  }

  // Any member can filter members by role
  @Get(':centerId/members/role/:role')
  @Roles('Admin', 'Owner', 'Teacher', 'Support')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Filter members by role in a center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiParam({ name: 'role', description: 'Role name' })
  @ApiResponse({
    status: 200,
    description: 'List of members with given role',
    type: MemberDto,
    isArray: true,
  })
  async filterMembersByRole(
    @Param('centerId') centerId: string,
    @Param('role') role: string,
  ) {
    return this.centersService.filterMembersByRole(centerId, role);
  }
}
