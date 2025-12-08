import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ClassStaffAccessDto } from '../dto/class-staff-access.dto';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkGrantClassStaffDto } from '../dto/bulk-grant-class-staff.dto';
import { BulkRevokeClassStaffDto } from '../dto/bulk-revoke-class-staff.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { ClassStaffService } from '../services/class-staff.service';
import { SerializeOptions } from '@nestjs/common';
import { ClassStaffResponseDto } from '../dto/class-staff-response.dto';

@ApiTags('Classes - Staff Access')
@Controller('classes/staff/access')
export class ClassStaffAccessController {
  constructor(
    private readonly bulkOperationService: BulkOperationService,
    private readonly classStaffService: ClassStaffService,
  ) {}

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
  @Permissions(PERMISSIONS.CLASSES.UPDATE)
  @Transactional()
  @SerializeOptions({ type: ClassStaffResponseDto })
  async assignStaffToClass(
    @Body() classStaffAccessDto: ClassStaffAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    const classStaff = await this.classStaffService.assignProfileToClass(
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
  @Permissions(PERMISSIONS.CLASSES.UPDATE)
  @Transactional()
  async removeStaffFromClass(
    @Body() classStaffAccessDto: ClassStaffAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.classStaffService.removeUserFromClass(
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
  @Transactional()
  async bulkGrantClassStaffAccess(
    @Body() dto: BulkGrantClassStaffDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        const classStaffAccessDto: ClassStaffAccessDto = {
          userProfileId,
          classId: dto.classId,
          centerId: actor.centerId!,
        };
        await this.classStaffService.assignProfileToClass(
          classStaffAccessDto,
          actor,
        );
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(
      result,
      't.success.bulkGrantBranchAccess',
    );
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
  @Transactional()
  async bulkRevokeClassStaffAccess(
    @Body() dto: BulkRevokeClassStaffDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        const classStaffAccessDto: ClassStaffAccessDto = {
          userProfileId,
          classId: dto.classId,
          centerId: actor.centerId!,
        };
        await this.classStaffService.removeUserFromClass(
          classStaffAccessDto,
          actor,
        );
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(
      result,
      't.success.bulkRevokeBranchAccess',
    );
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
    @Param('classId', ParseUUIDPipe) classId: string,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classStaffService.getClassStaff(classId, actor);
    return ControllerResponse.success(result, 't.success.dataRetrieved');
  }
}
