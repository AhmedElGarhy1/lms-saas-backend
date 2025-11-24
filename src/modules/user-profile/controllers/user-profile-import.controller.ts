import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UserProfileImportService } from '../services/user-profile-import.service';
import { RequestImportOtpDto } from '../dto/request-import-otp.dto';
import { VerifyUserImportDto } from '../dto/verify-user-import.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { RateLimit } from '@/modules/rate-limit/decorators/rate-limit.decorator';

@ApiTags('User Profile Import')
@Controller('user-profiles/import')
export class UserProfileImportController {
  constructor(
    private readonly userProfileImportService: UserProfileImportService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  @Post('request-otp')
  @RateLimit({ limit: 1, windowSeconds: 60 }) // 1 request per minute
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
    description: 'Invalid phone number format',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async requestOtp(@Body() dto: RequestImportOtpDto) {
    // This endpoint doesn't require authentication as per plan
    await this.userProfileImportService.sendImportOtp(dto.phone);

    return ControllerResponse.success(
      null,
      this.i18n.translate('t.success.otpSent'),
    );
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
  async verifyAndImport(
    @Body() dto: VerifyUserImportDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.userProfileImportService.verifyAndImportUser(
      dto,
      actor,
    );

    return ControllerResponse.success(
      result,
      this.i18n.translate('t.success.userImported'),
    );
  }
}
