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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { GroupsService } from '../services/groups.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { PaginateGroupsDto } from '../dto/paginate-groups.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { SerializeOptions } from '@nestjs/common';
import { GroupResponseDto } from '../dto/group-response.dto';
import { AssignStudentToGroupDto } from '../dto/assign-student-to-group.dto';
import { RemoveStudentsFromGroupDto } from '../dto/remove-students-from-group.dto';
import { CreateApiResponses } from '@/shared/common/decorators';

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all groups for a center with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Groups retrieved successfully',
  })
  @Permissions(PERMISSIONS.GROUPS.READ)
  @SerializeOptions({ type: GroupResponseDto })
  async paginateGroups(
    @Query() paginateDto: PaginateGroupsDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.groupsService.paginateGroups(paginateDto, actor);
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.group' },
    });
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Get a specific group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Group retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  @Permissions(PERMISSIONS.GROUPS.READ)
  @SerializeOptions({ type: GroupResponseDto })
  async getGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.groupsService.getGroup(groupId, actor);
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.group' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @Permissions(PERMISSIONS.GROUPS.CREATE)
  @Transactional()
  @SerializeOptions({ type: GroupResponseDto })
  async createGroup(
    @Body() createGroupDto: CreateGroupDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.groupsService.createGroup(createGroupDto, actor);
    return ControllerResponse.success(result, {
      key: 't.messages.created',
      args: { resource: 't.resources.group' },
    });
  }

  @Put(':groupId')
  @ApiOperation({ summary: 'Update a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  @Permissions(PERMISSIONS.GROUPS.UPDATE)
  @Transactional()
  @SerializeOptions({ type: GroupResponseDto })
  async updateGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() data: UpdateGroupDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.groupsService.updateGroup(groupId, data, actor);
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.group' },
    });
  }

  @Delete(':groupId')
  @ApiOperation({ summary: 'Delete a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Group deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  @Permissions(PERMISSIONS.GROUPS.DELETE)
  @Transactional()
  async deleteGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @GetUser() actor: ActorUser,
  ) {
    await this.groupsService.deleteGroup(groupId, actor);
    return ControllerResponse.message({
      key: 't.messages.deleted',
      args: { resource: 't.resources.group' },
    });
  }

  @Patch(':groupId/restore')
  @UpdateApiResponses('Restore deleted group')
  @ApiParam({ name: 'groupId', description: 'Group ID', type: String })
  @Permissions(PERMISSIONS.GROUPS.RESTORE)
  @Transactional()
  @SerializeOptions({ type: GroupResponseDto })
  async restoreGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @GetUser() actor: ActorUser,
  ) {
    await this.groupsService.restoreGroup(groupId, actor);
    return ControllerResponse.message({
      key: 't.messages.restored',
      args: { resource: 't.resources.group' },
    });
  }

  @Post(':groupId/students/assign')
  @CreateApiResponses('Assign a student to a group')
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiBody({ type: AssignStudentToGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Student assigned successfully',
  })
  @Permissions(PERMISSIONS.GROUPS.UPDATE)
  @Transactional()
  async assignStudentToGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: AssignStudentToGroupDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.groupsService.assignStudentToGroup(
      groupId,
      dto.userProfileId,
      actor,
    );
    return ControllerResponse.message({
      key: 't.messages.updated',
      args: { resource: 't.resources.group' },
    });
  }

  @Delete(':groupId/students')
  @ApiOperation({ summary: 'Remove students from a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Bulk remove completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.GROUPS.UPDATE)
  @Transactional()
  async removeStudentsFromGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: RemoveStudentsFromGroupDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.groupsService.removeStudentsFromGroup(
      groupId,
      dto.studentUserProfileIds,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.groupStudent',
      },
    });
  }
}
