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
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResultDto } from '@/shared/common/dto/bulk-operation-result.dto';
import { BulkDeleteUserProfilesDto } from '../dto/bulk-delete-user-profiles.dto';
import { BulkRestoreUserProfilesDto } from '../dto/bulk-restore-user-profiles.dto';
import { BulkToggleUserProfileStatusDto } from '../dto/bulk-toggle-user-profile-status.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { UserProfileService } from '../services/user-profile.service';
import { UserService } from '@/modules/user/services/user.service';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';

@ApiBearerAuth()
@ApiTags('User Profiles Actions')
@Controller('user-profiles/actions')
export class UserProfileActionsController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
    private readonly bulkOperationService: BulkOperationService,
  ) {}

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete user profiles' })
  @ApiBody({ type: BulkDeleteUserProfilesDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.STAFF.DELETE)
  @Transactional()
  async bulkDelete(
    @Body() dto: BulkDeleteUserProfilesDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        await this.userProfileService.deleteUserProfile(userProfileId, actor);
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(
      result,
      't.messages.bulkOperationSuccess',
      {
        count: result.success.toString(),
        item: 't.resources.profile',
      },
    );
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Bulk restore deleted user profiles' })
  @ApiBody({ type: BulkRestoreUserProfilesDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk restore completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.STAFF.RESTORE)
  @Transactional()
  async bulkRestore(
    @Body() dto: BulkRestoreUserProfilesDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        await this.userProfileService.restoreUserProfile(userProfileId, actor);
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(
      result,
      't.messages.bulkOperationSuccess',
      {
        count: result.success.toString(),
        item: 't.resources.profile',
      },
    );
  }

  @Post('bulk/status')
  @ApiOperation({ summary: 'Bulk toggle user profile active status' })
  @ApiBody({ type: BulkToggleUserProfileStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk status toggle completed',
    type: BulkOperationResultDto,
  })
  @Permissions(PERMISSIONS.STAFF.ACTIVATE)
  @Transactional()
  async bulkToggleStatus(
    @Body() dto: BulkToggleUserProfileStatusDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<BulkOperationResultDto>> {
    const result = await this.bulkOperationService.executeBulk(
      dto.userProfileIds,
      async (userProfileId: string) => {
        await this.userService.activateProfileUser(
          userProfileId,
          dto.isActive,
          actor,
        );
        return { id: userProfileId };
      },
    );

    return ControllerResponse.success(
      result,
      't.messages.bulkOperationSuccess',
      {
        count: result.success.toString(),
        item: 't.resources.profile',
      },
    );
  }
}
