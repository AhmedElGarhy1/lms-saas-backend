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
import { GroupIdParamDto } from '../dto/group-id-param.dto';
import { DeletedGroupIdParamDto } from '../dto/deleted-group-id-param.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser, ManagerialOnly } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { SerializeOptions } from '@nestjs/common';
import { GroupResponseDto } from '../dto/group-response.dto';
import { CreateApiResponses } from '@/shared/common/decorators';

@ApiTags('Groups')
@Controller('groups')
@ManagerialOnly()
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
    return ControllerResponse.success(result);
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
    @Param() params: DeletedGroupIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.groupsService.getGroup(
      params.groupId,
      actor,
      true,
    ); // includeDeleted: true for API endpoints
    return ControllerResponse.success(result);
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
    return ControllerResponse.success(result);
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
    @Param() params: GroupIdParamDto,
    @Body() data: UpdateGroupDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.groupsService.updateGroup(
      params.groupId,
      data,
      actor,
    );
    return ControllerResponse.success(result);
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
    @Param() params: GroupIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.groupsService.deleteGroup(params.groupId, actor);
    return ControllerResponse.success(null);
  }

  @Patch(':groupId/restore')
  @UpdateApiResponses('Restore deleted group')
  @ApiParam({ name: 'groupId', description: 'Group ID', type: String })
  @Permissions(PERMISSIONS.GROUPS.RESTORE)
  @Transactional()
  @SerializeOptions({ type: GroupResponseDto })
  async restoreGroup(
    @Param() params: DeletedGroupIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.groupsService.restoreGroup(params.groupId, actor);
    return ControllerResponse.success(null);
  }
}
