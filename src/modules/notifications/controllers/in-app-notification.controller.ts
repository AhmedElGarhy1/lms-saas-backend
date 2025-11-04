import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { InAppNotificationService } from '../services/in-app-notification.service';
import {
  GetInAppNotificationsDto,
  InAppNotificationResponseDto,
  PaginatedInAppNotificationsDto,
  MarkAsReadDto,
  UnreadCountResponseDto,
} from '../dto/in-app-notification.dto';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { plainToInstance } from 'class-transformer';

@ApiTags('In-App Notifications')
@Controller('notifications/in-app')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InAppNotificationController {
  constructor(
    private readonly inAppNotificationService: InAppNotificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user in-app notifications' })
  async getNotifications(
    @GetUser() actor: ActorUser,
    @Query() query: GetInAppNotificationsDto,
  ): Promise<PaginatedInAppNotificationsDto> {
    const result = await this.inAppNotificationService.getUserNotifications(
      actor.id,
      query,
    );

    const notifications = result.data.map((n) =>
      plainToInstance(InAppNotificationResponseDto, {
        ...n,
        isRead: n.readAt !== null,
      }),
    );

    return {
      data: notifications,
      total: result.total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      hasMore: result.hasMore,
    };
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications' })
  async getUnread(
    @GetUser() actor: ActorUser,
    @Query('profileType') profileType?: ProfileType,
    @Query('profileId') profileId?: string,
  ): Promise<InAppNotificationResponseDto[]> {
    const notifications =
      await this.inAppNotificationService.getUnreadNotifications(
        actor.id,
        profileType,
        profileId,
      );

    return notifications.map((n) =>
      plainToInstance(InAppNotificationResponseDto, {
        ...n,
        isRead: n.readAt !== null,
      }),
    );
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(
    @GetUser() actor: ActorUser,
    @Query('profileType') profileType?: ProfileType,
    @Query('profileId') profileId?: string,
  ): Promise<UnreadCountResponseDto> {
    const count = await this.inAppNotificationService.getUnreadCount(
      actor.id,
      profileType,
      profileId,
    );

    return {
      count,
      profileType: profileType ?? null,
      profileId: profileId ?? null,
    };
  }

  @Put('read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  async markAsRead(
    @GetUser() actor: ActorUser,
    @Body() dto: MarkAsReadDto,
  ): Promise<{ success: boolean }> {
    await this.inAppNotificationService.markMultipleAsRead(
      dto.notificationIds,
      actor.id,
    );
    return { success: true };
  }

  @Put(':id/unread')
  @ApiOperation({ summary: 'Mark notification as unread' })
  async markAsUnread(
    @GetUser() actor: ActorUser,
    @Param('id') notificationId: string,
  ): Promise<{ success: boolean }> {
    // Note: This uses the repository directly since service doesn't have markAsUnread
    // For now, we can implement it in the service or call repository
    await this.inAppNotificationService.notificationRepository.markAsUnread(
      notificationId,
      actor.id,
    );
    return { success: true };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @GetUser() actor: ActorUser,
    @Query('profileType') profileType?: ProfileType,
    @Query('profileId') profileId?: string,
  ): Promise<{ success: boolean }> {
    await this.inAppNotificationService.markAllAsRead(
      actor.id,
      profileType,
      profileId,
    );
    return { success: true };
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive a notification' })
  async archive(
    @GetUser() actor: ActorUser,
    @Param('id') notificationId: string,
  ): Promise<{ success: boolean }> {
    await this.inAppNotificationService.archive(actor.id, notificationId);
    return { success: true };
  }

  @Get('archived')
  @ApiOperation({ summary: 'Get archived notifications' })
  async getArchived(
    @GetUser() actor: ActorUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<PaginatedInAppNotificationsDto> {
    const [notifications, total] =
      await this.inAppNotificationService.notificationRepository.findArchived(
        actor.id,
        page,
        limit,
      );

    const data = notifications.map((n) =>
      plainToInstance(InAppNotificationResponseDto, {
        ...n,
        isRead: n.readAt !== null,
      }),
    );

    return {
      data,
      total,
      page,
      limit,
      hasMore: (page - 1) * limit + notifications.length < total,
    };
  }
}
