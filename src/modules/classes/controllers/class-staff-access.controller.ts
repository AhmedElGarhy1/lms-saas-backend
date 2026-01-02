import { Controller, Post, Delete, Get, Body, Param } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ClassStaffAccessDto } from '../dto/class-staff-access.dto';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { BulkGrantClassStaffDto } from '../dto/bulk-grant-class-staff.dto';
import { BulkRevokeClassStaffDto } from '../dto/bulk-revoke-class-staff.dto';
import { ClassIdParamDto } from '../dto/class-id-param.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { ClassStaffService } from '../services/class-staff.service';
import { SerializeOptions } from '@nestjs/common';
import { ClassStaffResponseDto } from '../dto/class-staff-response.dto';
import { ManagerialOnly } from '@/shared/common/decorators';

@ApiTags('Classes - Staff Access')
@Controller('classes/staff/access')
@ManagerialOnly()
export class ClassStaffAccessController {
  constructor(private readonly classStaffService: ClassStaffService) {}

  @Post()
  @ApiOperation({ summary: 'Assign staff to class' })
  @ApiResponse({
    status: 201,
    description: 'Staff assigned to class successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Staff already assigned to class',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff or class not found',
  })
  @Permissions(PERMISSIONS.CLASSES.MANAGE_CLASS_STAFF_ACCESS)
  @Transactional()
  @SerializeOptions({ type: ClassStaffResponseDto })
  async assignStaffToClass(
    @Body() classStaffAccessDto: ClassStaffAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const classStaff = await this.classStaffService.assignStaffToClass(
      classStaffAccessDto,
      actor,
    );
    return classStaff;
  }

  @Delete()
  @ApiOperation({ summary: 'Remove staff from class' })
  @ApiResponse({
    status: 200,
    description: 'Staff removed from class successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff assignment not found',
  })
  @Permissions(PERMISSIONS.CLASSES.MANAGE_CLASS_STAFF_ACCESS)
  @Transactional()
  async removeStaffFromClass(
    @Body() classStaffAccessDto: ClassStaffAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.classStaffService.removeStaffFromClass(
      classStaffAccessDto,
      actor,
    );
  }

  @Post('bulk/grant')
  @ApiOperation({ summary: 'Bulk grant class staff access to multiple users' })
  @ApiBody({ type: BulkGrantClassStaffDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk grant completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.CLASSES.MANAGE_CLASS_STAFF_ACCESS)
  @Transactional()
  async bulkGrantClassStaffAccess(
    @Body() dto: BulkGrantClassStaffDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.classStaffService.bulkAssignStaffToClass(
      dto.classId,
      dto.userProfileIds,
      actor,
    );

    return ControllerResponse.success(result);
  }

  @Post('bulk/revoke')
  @ApiOperation({
    summary: 'Bulk revoke class staff access from multiple users',
  })
  @ApiBody({ type: BulkRevokeClassStaffDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk revoke completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.CLASSES.MANAGE_CLASS_STAFF_ACCESS)
  @Transactional()
  async bulkRevokeClassStaffAccess(
    @Body() dto: BulkRevokeClassStaffDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.classStaffService.bulkRemoveStaffFromClass(
      dto.classId,
      dto.userProfileIds,
      actor,
    );

    return ControllerResponse.success(result);
  }

  @Get(':classId')
  @ApiOperation({ summary: 'Get all staff assigned to a class' })
  @ApiResponse({
    status: 200,
    description: 'Staff list retrieved successfully',
  })
  @Permissions(PERMISSIONS.CLASSES.READ)
  @SerializeOptions({ type: ClassStaffResponseDto })
  async getClassStaff(
    @Param() params: ClassIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classStaffService.getClassStaff(
      params.classId,
      actor,
    );
    return ControllerResponse.success(result);
  }
}
