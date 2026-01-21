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
import { ApiTags, ApiParam, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
import { DeletedUserProfileIdParamDto } from '../dto/deleted-user-profile-id-param.dto';
import { ProfileResponseDto } from '../dto/profile-response.dto';
import { ProfileLookupParamDto } from '../dto/profile-lookup-param.dto';
import { ProfileLookupResponseDto } from '../dto/profile-lookup-response.dto';
import { Cacheable } from '@/shared/common/decorators/cache.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { IRequest } from '@/shared/common/interfaces/request.interface';

@ApiTags('User Profiles')
@Controller('user-profiles')
export class UserProfileController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
  ) {}

  @Get('lookup/:id')
  @ApiOperation({
    summary: 'Lookup user profile by ID or student code',
    description: 'Returns userProfileId and code. Accepts UUID (userProfileId) or student code. No authentication required.',
  })
  @ApiParam({
    name: 'id',
    description: 'User Profile ID (UUID) or Student Code',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile found successfully',
    type: ProfileLookupResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Profile not found',
  })
  @SerializeOptions({ type: ProfileLookupResponseDto })
  @Cacheable(86400) // 24 hours cache for immutable data
  async lookupProfile(@Param() params: ProfileLookupParamDto) {
    const result = await this.userProfileService.lookupProfile(params.id);
    return ControllerResponse.success(result);
  }

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

    return ControllerResponse.success(null);
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

    return ControllerResponse.success(profile);
  }

  @Get()
  @ReadApiResponses('List user profiles with pagination and filtering')
  @NoProfile()
  async listProfiles(@GetUser() actor: ActorUser) {
    // Currently returns the actor user's profiles; can be expanded later
    const profiles = await this.userProfileService.listProfiles(actor);

    return ControllerResponse.success(profiles);
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
    return ControllerResponse.success(profile);
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

    return ControllerResponse.success({
      id: params.id,
      isActive: dto.isActive,
    });
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
    return ControllerResponse.success({ id: params.id });
  }

  @Patch(':id/restore')
  @UpdateApiResponses('Restore soft-deleted user profile')
  @ApiParam({ name: 'id', description: 'User Profile ID', type: String })
  @Permissions(PERMISSIONS.STAFF.RESTORE)
  @Transactional()
  @ManagerialOnly()
  async restoreProfile(
    @Param() params: DeletedUserProfileIdParamDto,
    @GetUser() actorUser: ActorUser,
  ) {
    await this.userProfileService.restoreUserProfile(params.id, actorUser);
    // Note: Activity logging should be handled by event listeners if UserProfileService emits events
    return ControllerResponse.success({ id: params.id });
  }
}
