import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { CenterAccessDto } from '@/modules/access-control/dto/center-access.dto';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { BulkGrantCenterAccessDto } from '@/modules/access-control/dto/bulk-grant-center-access.dto';
import { BulkRevokeCenterAccessDto } from '@/modules/access-control/dto/bulk-revoke-center-access.dto';
import { BulkToggleCenterAccessStatusDto } from '@/modules/access-control/dto/bulk-toggle-center-access-status.dto';
import { BulkDeleteCenterAccessDto } from '@/modules/access-control/dto/bulk-delete-center-access.dto';
import { BulkRestoreCenterAccessDto } from '@/modules/access-control/dto/bulk-restore-center-access.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';

@ApiBearerAuth()
@ApiTags('Centers Access Actions')
@Controller('centers/access/actions')
export class CentersAccessActionsController {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly bulkOperationService: BulkOperationService,
  ) {}

  @Post('bulk/grant')
  @ApiOperation({ summary: 'Bulk grant center access to multiple users' })
  @ApiBody({ type: BulkGrantCenterAccessDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk grant completed',
    type: BulkOperationResultDto,
  })
  @Transactional()
  async bulkGrantCenterAccess(
    @Body() dto: BulkGrantCenterAccessDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        const centerAccessDto: CenterAccessDto = {
          userProfileId,
          centerId: dto.centerId,
        };
        await this.accessControlService.grantCenterAccessAndValidatePermission(
          centerAccessDto,
          actor,
        );
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.centerAccess',
      },
    });
  }

  @Post('bulk/revoke')
  @ApiOperation({ summary: 'Bulk revoke center access from multiple users' })
  @ApiBody({ type: BulkRevokeCenterAccessDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk revoke completed',
    type: BulkOperationResultDto,
  })
  @Transactional()
  async bulkRevokeCenterAccess(
    @Body() dto: BulkRevokeCenterAccessDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        const centerAccessDto: CenterAccessDto = {
          userProfileId,
          centerId: dto.centerId,
        };
        await this.accessControlService.revokeCenterAccess(
          centerAccessDto,
          actor,
        );
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.centerAccess',
      },
    });
  }

  @Post('bulk/status')
  @ApiOperation({
    summary: 'Bulk toggle center access active status for multiple users',
  })
  @ApiBody({ type: BulkToggleCenterAccessStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk status toggle completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.STAFF.ACTIVATE_CENTER_ACCESS)
  @Transactional()
  async bulkToggleCenterAccessStatus(
    @Body() dto: BulkToggleCenterAccessStatusDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        await this.accessControlService.activateCenterAccess(
          {
            userProfileId,
            centerId: dto.centerId,
          },
          dto.isActive,
          actor,
        );
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.centerAccess',
      },
    });
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete center access for multiple users' })
  @ApiBody({ type: BulkDeleteCenterAccessDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.STAFF.DELETE_CENTER_ACCESS)
  @Transactional()
  async bulkDeleteCenterAccess(
    @Body() dto: BulkDeleteCenterAccessDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        await this.accessControlService.softRemoveCenterAccess(
          {
            userProfileId,
            centerId: dto.centerId,
          },
          actor,
        );
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.centerAccess',
      },
    });
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Bulk restore center access for multiple users' })
  @ApiBody({ type: BulkRestoreCenterAccessDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk restore completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.STAFF.RESTORE_CENTER_ACCESS)
  @Transactional()
  async bulkRestoreCenterAccess(
    @Body() dto: BulkRestoreCenterAccessDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        await this.accessControlService.restoreCenterAccess(
          {
            userProfileId,
            centerId: dto.centerId,
          },
          actor,
        );
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.centerAccess',
      },
    });
  }
}
