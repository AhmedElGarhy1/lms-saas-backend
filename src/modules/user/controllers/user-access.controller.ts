import { Controller, Post, Body, Delete } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import {
  ApiTags,
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import {
  CreateApiResponses,
  DeleteApiResponses,
} from '@/shared/common/decorators';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { BulkGrantUserAccessDto } from '@/modules/user/dto/bulk-grant-user-access.dto';
import { BulkRevokeUserAccessDto } from '@/modules/user/dto/bulk-revoke-user-access.dto';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiBearerAuth()
@ApiTags('User Access')
@Controller('users/access')
export class UserAccessController {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly bulkOperationService: BulkOperationService,
  ) {}

  @Post()
  @CreateApiResponses('Grant user access to another user')
  @ApiBody({ type: UserAccessDto })
  @Transactional()
  async grantUserAccess(
    @Body() dto: UserAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    // Validation is now handled in AccessControlService.grantUserAccessValidate
    await this.accessControlService.grantUserAccessValidate(dto, actor);

    return ControllerResponse.message({
      key: 't.messages.granted',
      args: { resource: 't.resources.userAccess' },
    });
  }

  @Delete()
  @DeleteApiResponses('Revoke user access to another user')
  @ApiBody({ type: UserAccessDto })
  @Transactional()
  async revokeUserAccess(
    @Body() dto: UserAccessDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.accessControlService.revokeUserAccessValidate(dto, actor);

    return ControllerResponse.message({
      key: 't.messages.revoked',
      args: { resource: 't.resources.userAccess' },
    });
  }

  @Post('bulk/grant')
  @ApiOperation({ summary: 'Bulk grant user access to multiple users' })
  @ApiBody({ type: BulkGrantUserAccessDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk grant completed',
    type: BulkOperationResultDto,
  })
  @Transactional()
  async bulkGrantUserAccess(
    @Body() dto: BulkGrantUserAccessDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.targetUserProfileIds,
      async (targetUserProfileId: string) => {
        const userAccessDto: UserAccessDto = {
          granterUserProfileId: dto.granterUserProfileId,
          targetUserProfileId,
          centerId: dto.centerId,
        };
        await this.accessControlService.grantUserAccessValidate(
          userAccessDto,
          actor,
        );
        return { id: targetUserProfileId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.userAccess',
      },
    });
  }

  @Post('bulk/revoke')
  @ApiOperation({ summary: 'Bulk revoke user access from multiple users' })
  @ApiBody({ type: BulkRevokeUserAccessDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk revoke completed',
    type: BulkOperationResultDto,
  })
  @Transactional()
  async bulkRevokeUserAccess(
    @Body() dto: BulkRevokeUserAccessDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResult>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.targetUserProfileIds,
      async (targetUserProfileId: string) => {
        const userAccessDto: UserAccessDto = {
          granterUserProfileId: dto.granterUserProfileId,
          targetUserProfileId,
          centerId: dto.centerId,
        };
        await this.accessControlService.revokeUserAccessValidate(
          userAccessDto,
          actor,
        );
        return { id: targetUserProfileId };
      },
    );

    return ControllerResponse.success(result, {
      key: 't.messages.bulkOperationSuccess',
      args: {
        count: result.success.toString(),
        item: 't.resources.userAccess',
      },
    });
  }
}
