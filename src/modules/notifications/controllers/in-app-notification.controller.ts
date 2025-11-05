import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { InAppNotificationService } from '../services/in-app-notification.service';
import {
  GetInAppNotificationsDto,
  MarkAsReadDto,
} from '../dto/in-app-notification.dto';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Pagination } from 'nestjs-typeorm-paginate';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { Notification } from '../entities/notification.entity';

@ApiTags('In-App Notifications')
@Controller('notifications/in-app')
export class InAppNotificationController {
  constructor(
    private readonly inAppNotificationService: InAppNotificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user in-app notifications' })
  async getNotifications(
    @GetUser() actor: ActorUser,
    @Query() query: GetInAppNotificationsDto,
  ): Promise<Pagination<Notification>> {
    return this.inAppNotificationService.getUserNotifications(actor.id, query);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications' })
  async getUnread(
    @GetUser() actor: ActorUser,
    @Query('profileType') profileType?: ProfileType,
    @Query('profileId') profileId?: string,
  ) {
    const notifications =
      await this.inAppNotificationService.getUnreadNotifications(
        actor.id,
        profileType,
        profileId,
      );

    return notifications;
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(
    @GetUser() actor: ActorUser,
    @Query('profileType') profileType?: ProfileType,
    @Query('profileId') profileId?: string,
  ) {
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
    @Query() query: BasePaginationDto,
  ): Promise<Pagination<Notification>> {
    return await this.inAppNotificationService.getArchivedNotifications(
      actor.id,
      query,
    );
  }
}
