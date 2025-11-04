import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import {
  UpdateNotificationPreferenceDto,
  BulkUpdatePreferenceDto,
  NotificationPreferenceResponseDto,
} from '../dto/notification-preference.dto';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationGroup } from '../enums/notification-group.enum';
import { plainToInstance } from 'class-transformer';

@Controller('notifications/preferences')
@ApiTags('Notifications - Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationPreferenceController {
  constructor(
    private readonly preferenceService: NotificationPreferenceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
    type: [NotificationPreferenceResponseDto],
  })
  async getPreferences(
    @GetUser() actor: ActorUser,
    @Query('profileType') profileType?: string,
    @Query('profileId') profileId?: string,
  ): Promise<NotificationPreferenceResponseDto[]> {
    const preferences = await this.preferenceService.getPreferences(actor.id);

    // Filter by profile if specified
    let filteredPreferences = preferences;
    if (profileType && profileId) {
      filteredPreferences = preferences.filter(
        (pref) =>
          pref.profileType === profileType && pref.profileId === profileId,
      );
    } else {
      // Return user-level preferences (null profileType and profileId)
      filteredPreferences = preferences.filter(
        (pref) => !pref.profileType && !pref.profileId,
      );
    }

    return plainToInstance(
      NotificationPreferenceResponseDto,
      filteredPreferences,
    );
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update single notification preference' })
  @ApiResponse({
    status: 200,
    description: 'Preference updated successfully',
    type: NotificationPreferenceResponseDto,
  })
  async updatePreference(
    @GetUser() actor: ActorUser,
    @Body() dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    const preference = await this.preferenceService.updatePreference(
      actor.id,
      dto.channel,
      dto.group,
      dto.enabled,
      dto.profileType ?? null,
      dto.profileId ?? null,
    );

    return plainToInstance(NotificationPreferenceResponseDto, preference);
  }

  @Put('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update multiple notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    type: [NotificationPreferenceResponseDto],
  })
  async updatePreferencesBulk(
    @GetUser() actor: ActorUser,
    @Body() dto: BulkUpdatePreferenceDto,
  ): Promise<NotificationPreferenceResponseDto[]> {
    const preferences = await Promise.all(
      dto.preferences.map((pref) =>
        this.preferenceService.updatePreference(
          actor.id,
          pref.channel,
          pref.group,
          pref.enabled,
          pref.profileType ?? null,
          pref.profileId ?? null,
        ),
      ),
    );

    return plainToInstance(NotificationPreferenceResponseDto, preferences);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Get available notification channels' })
  @ApiResponse({
    status: 200,
    description: 'Available channels',
    schema: {
      type: 'object',
      properties: {
        channels: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  getChannels(): { channels: string[] } {
    return {
      channels: Object.values(NotificationChannel),
    };
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get available notification groups' })
  @ApiResponse({
    status: 200,
    description: 'Available groups',
    schema: {
      type: 'object',
      properties: {
        groups: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  getGroups(): { groups: string[] } {
    return {
      groups: Object.values(NotificationGroup),
    };
  }
}
