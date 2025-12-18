import { Controller, Post, Delete, Get, Body, Param } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GroupStudentAccessDto } from '../dto/group-student-access.dto';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { BulkGrantGroupStudentDto } from '../dto/bulk-grant-group-student.dto';
import { BulkRevokeGroupStudentDto } from '../dto/bulk-revoke-group-student.dto';
import { GroupIdParamDto } from '../dto/group-id-param.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { GroupStudentService } from '../services/group-student.service';
import { SerializeOptions } from '@nestjs/common';
import { GroupStudent } from '../entities/group-student.entity';

@ApiTags('Groups - Students Access')
@Controller('groups/students/access')
export class GroupsStudentsAccessController {
  constructor(private readonly groupStudentService: GroupStudentService) {}

  @Post()
  @ApiOperation({ summary: 'Assign student to group' })
  @ApiResponse({
    status: 201,
    description: 'Student assigned to group successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Student already assigned to group',
  })
  @ApiResponse({
    status: 404,
    description: 'Student or group not found',
  })
  @Permissions(PERMISSIONS.GROUPS.MANAGE_GROUP_STUDENT_ACCESS)
  @Transactional()
  async assignStudentToGroup(
    @Body() groupStudentAccessDto: GroupStudentAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.groupStudentService.assignStudentToGroup(
      groupStudentAccessDto,
      actor,
    );
    return ControllerResponse.message({
      key: 't.messages.assigned',
      args: { resource: 't.resources.groupStudent' },
    });
  }

  @Delete()
  @ApiOperation({ summary: 'Remove student from group' })
  @ApiResponse({
    status: 200,
    description: 'Student removed from group successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student assignment not found',
  })
  @Permissions(PERMISSIONS.GROUPS.MANAGE_GROUP_STUDENT_ACCESS)
  @Transactional()
  async removeStudentFromGroup(
    @Body() groupStudentAccessDto: GroupStudentAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.groupStudentService.removeStudentsFromGroup(
      groupStudentAccessDto.groupId,
      [groupStudentAccessDto.userProfileId],
    );
    return ControllerResponse.message({
      key: 't.messages.removed',
      args: { resource: 't.resources.groupStudent' },
    });
  }

  @Post('bulk/grant')
  @ApiOperation({
    summary: 'Bulk grant group student access to multiple users',
  })
  @ApiBody({ type: BulkGrantGroupStudentDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk grant completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.GROUPS.MANAGE_GROUP_STUDENT_ACCESS)
  @Transactional()
  async bulkGrantGroupStudentAccess(
    @Body() dto: BulkGrantGroupStudentDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.groupStudentService.bulkAssignStudentsToGroup(
      dto.groupId,
      dto.userProfileIds,
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

  @Post('bulk/revoke')
  @ApiOperation({
    summary: 'Bulk revoke group student access from multiple users',
  })
  @ApiBody({ type: BulkRevokeGroupStudentDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk revoke completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.GROUPS.MANAGE_GROUP_STUDENT_ACCESS)
  @Transactional()
  async bulkRevokeGroupStudentAccess(
    @Body() dto: BulkRevokeGroupStudentDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.groupStudentService.removeStudentsFromGroup(
      dto.groupId,
      dto.userProfileIds,
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.groupStudent',
      },
    });
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Get all students assigned to a group' })
  @ApiResponse({
    status: 200,
    description: 'Students list retrieved successfully',
  })
  @Permissions(PERMISSIONS.GROUPS.READ)
  @SerializeOptions({ type: GroupStudent })
  async getGroupStudents(
    @Param() params: GroupIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.groupStudentService.getGroupStudents(
      params.groupId,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.groupStudent' },
    });
  }
}
