import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { NotificationIdParamDto } from '../dto/notification-id-param.dto';
import { Transactional } from '@nestjs-cls/transactional';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { InAppNotificationService } from '../services/in-app-notification.service';
import {
  GetInAppNotificationsDto,
  MarkAsReadDto,
} from '../dto/in-app-notification.dto';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Pagination } from '@/shared/common/types/pagination.types';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { Notification } from '../entities/notification.entity';
import { NoContext } from '@/shared/common/decorators/no-context.decorator';
import { NoProfile } from '@/shared/common/decorators/no-profile.decorator';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiTags('In-App Notifications')
@Controller('notifications/in-app')
@NoProfile()
@NoContext()
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
    const result = await this.inAppNotificationService.getUserNotifications(
      actor.id,
      query,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.notification' },
    }) as any;
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

    return ControllerResponse.success(notifications, {
      key: 't.messages.found',
      args: { resource: 't.resources.notification' },
    });
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

    return ControllerResponse.success(
      {
        count,
        profileType: profileType ?? null,
        profileId: profileId ?? null,
      },
      {
        key: 't.messages.found',
        args: { resource: 't.resources.notification' },
      },
    );
  }

  @Put('read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  @Transactional()
  async markAsRead(@GetUser() actor: ActorUser, @Body() dto: MarkAsReadDto) {
    await this.inAppNotificationService.markMultipleAsRead(
      dto.notificationIds,
      actor.id,
    );
    return ControllerResponse.message({
      key: 't.messages.updated',
      args: { resource: 't.resources.notification' },
    });
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Transactional()
  async markAllAsRead(
    @GetUser() actor: ActorUser,
    @Query('profileType') profileType?: ProfileType,
    @Query('profileId') profileId?: string,
  ) {
    await this.inAppNotificationService.markAllAsRead(
      actor.id,
      profileType,
      profileId,
    );
    return ControllerResponse.message({
      key: 't.messages.updated',
      args: { resource: 't.resources.notification' },
    });
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive a notification' })
  @Transactional()
  async archive(
    @GetUser() actor: ActorUser,
    @Param() params: NotificationIdParamDto,
  ) {
    await this.inAppNotificationService.archive(actor.id, params.id);
    return ControllerResponse.message({
      key: 't.messages.archived',
      args: { resource: 't.resources.notification' },
    });
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
