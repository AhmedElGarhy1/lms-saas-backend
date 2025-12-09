import { Controller, Post, Body } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UserProfileImportService } from '../services/user-profile-import.service';
import { RequestImportOtpDto } from '../dto/request-import-otp.dto';
import { VerifyUserImportDto } from '../dto/verify-user-import.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { RateLimit } from '@/modules/rate-limit/decorators/rate-limit.decorator';

@ApiTags('User Profile Import')
@Controller('user-profiles/import')
export class UserProfileImportController {
  constructor(
    private readonly userProfileImportService: UserProfileImportService,
  ) {}

  @Post('request-otp')
  @RateLimit({ limit: 3, windowSeconds: 60 }) // 3 requests per minute
  @ApiOperation({ summary: 'Request OTP for user import' })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid phone number format or center ID required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User already has profile or center access',
  })
  async requestOtp(
    @Body() dto: RequestImportOtpDto,
    @GetUser() actor: ActorUser,
  ) {
    // This endpoint doesn't require authentication as per plan
    await this.userProfileImportService.sendImportOtp(dto, actor);

    return ControllerResponse.success(null, {
      key: 't.messages.sent',
      args: { resource: 't.resources.otpCode' },
    });
  }

  @Post('verify')
  @RateLimit({ limit: 5, windowSeconds: 60 }) // 5 attempts per minute
  @ApiOperation({ summary: 'Verify OTP and import user' })
  @ApiResponse({
    status: 200,
    description: 'User imported successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            userProfileId: { type: 'string' },
            centerAccessId: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP code or expired',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User already has access to this center',
  })
  @Transactional()
  async verifyAndImport(
    @Body() dto: VerifyUserImportDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.userProfileImportService.verifyAndImportUser(
      dto,
      actor,
    );

    return ControllerResponse.success(result, {
      key: 't.messages.imported',
      args: { resource: 't.resources.user' },
    });
  }
}
