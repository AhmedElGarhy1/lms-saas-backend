import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Body,
  Delete,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiParam, ApiBody } from '@nestjs/swagger';
import {
  CreateApiResponses,
  ReadApiResponses,
  UpdateApiResponses,
  DeleteApiResponses,
  NoPhoneVerification,
  ManagerialOnly,
} from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { UserProfileService } from '../services/user-profile.service';
import { UserService } from '@/modules/user/services/user.service';
import { UpdateUserProfileStatusDto } from '../dto/update-user-profile-status.dto';
import { CreateUserProfileDto } from '../dto/create-user-profile.dto';
import { NoProfile } from '@/shared/common/decorators/no-profile.decorator';
import { UserProfileIdParamDto } from '../dto/user-profile-id-param.dto';
import { ProfileResponseDto } from '../dto/profile-response.dto';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { IRequest } from '@/shared/common/interfaces/request.interface';

@ApiTags('User Profiles')
@Controller('user-profiles')
export class UserProfileController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
  ) {}

  @Post()
  @CreateApiResponses('Create a new user profile')
  @ApiBody({ type: CreateUserProfileDto })
  @Transactional()
  @ManagerialOnly()
  async createProfile(
    @Body() dto: CreateUserProfileDto,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userProfileService.createProfile(dto, actorUser);

    return ControllerResponse.success(null, 'Resource created successfully');
  }

  @Get('me')
  @ReadApiResponses('Get current user profile')
  @SerializeOptions({ type: ProfileResponseDto })
  @NoProfile()
  @NoPhoneVerification()
  async getCurrentProfile(
    @GetUser() actor: ActorUser,
    @Req() request: IRequest,
  ) {
    const centerId = (request.get('x-center-id') ?? request.centerId) as string;
    const profile = await this.userProfileService.getCurrentUserProfile(
      actor,
      centerId,
    );

    return ControllerResponse.success(profile, 'Data retrieved successfully');
  }

  @Get()
  @ReadApiResponses('List user profiles with pagination and filtering')
  @NoProfile()
  async listProfiles(@GetUser() actor: ActorUser) {
    // Currently returns the actor user's profiles; can be expanded later
    const profiles = await this.userProfileService.listProfiles(actor);

    return ControllerResponse.success(profiles, 'Data retrieved successfully');
  }

  @Get(':id')
  @ReadApiResponses('Get user profile by ID')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @ManagerialOnly()
  async getProfile(
    @Param() params: UserProfileIdParamDto,
    @GetUser() actorUser: ActorUser,
  ) {
    const profile = await this.userProfileService.findOne(
      params.id,
      actorUser,
      true, // includeDeleted: true for API endpoints
    );
    return ControllerResponse.success(profile, 'Data retrieved successfully');
  }

  @Patch(':id/status')
  @UpdateApiResponses('Update user profile status (activate/deactivate)')
  @ApiBody({ type: UpdateUserProfileStatusDto })
  @Permissions(PERMISSIONS.STAFF.ACTIVATE)
  @ManagerialOnly()
  @Transactional()
  async updateStatus(
    @Param() params: UserProfileIdParamDto,
    @Body() dto: UpdateUserProfileStatusDto,
    @GetUser() actor: ActorUser,
  ) {
    // Use UserService method which handles event emission
    await this.userService.activateProfileUser(params.id, dto.isActive, actor);

    return ControllerResponse.success(
      { id: params.id, isActive: dto.isActive },
      'Resource updated successfully',
    );
  }

  @Delete(':id')
  @DeleteApiResponses('Soft delete user profile')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @Permissions(PERMISSIONS.STAFF.DELETE)
  @Transactional()
  @ManagerialOnly()
  async deleteProfile(
    @Param() params: UserProfileIdParamDto,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userProfileService.deleteUserProfile(params.id, actorUser);
    // Note: Activity logging should be handled by event listeners if UserProfileService emits events
    return ControllerResponse.success(
      { id: params.id },
      'Resource deleted successfully',
    );
  }

  @Patch(':id/restore')
  @UpdateApiResponses('Restore soft-deleted user profile')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @Permissions(PERMISSIONS.STAFF.RESTORE)
  @Transactional()
  @ManagerialOnly()
  async restoreProfile(
    @Param() params: UserProfileIdParamDto,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userProfileService.restoreUserProfile(params.id, actorUser);
    // Note: Activity logging should be handled by event listeners if UserProfileService emits events
    return ControllerResponse.success(
      { id: params.id },
      'Resource restored successfully',
    );
  }
}
