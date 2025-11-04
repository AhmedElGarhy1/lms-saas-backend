import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { NotificationLogRepository } from '../repositories/notification-log.repository';
import {
  GetNotificationHistoryDto,
  NotificationHistoryResponseDto,
  PaginatedNotificationHistoryResponseDto,
} from '../dto/notification-history.dto';
import { plainToInstance } from 'class-transformer';

@Controller('notifications/history')
@ApiTags('Notifications - History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationHistoryController {
  constructor(private readonly logRepository: NotificationLogRepository) {}

  @Get()
  @ApiOperation({ summary: 'Get user notification history with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Notification history retrieved successfully',
    type: PaginatedNotificationHistoryResponseDto,
  })
  async getHistory(
    @GetUser() actor: ActorUser,
    @Query() query: GetNotificationHistoryDto,
  ): Promise<PaginatedNotificationHistoryResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const filters: any = {};
    if (query.status) filters.status = query.status;
    if (query.channel) filters.channel = query.channel;
    if (query.type) filters.type = query.type;
    if (query.fromDate) filters.fromDate = new Date(query.fromDate);
    if (query.toDate) filters.toDate = new Date(query.toDate);

    const { data, total } = await this.logRepository.findUserHistory(
      actor.id,
      filters,
      page,
      limit,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: plainToInstance(NotificationHistoryResponseDto, data),
      total,
      page,
      limit,
      totalPages,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single notification details' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Notification details retrieved successfully',
    type: NotificationHistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async getNotificationDetails(
    @GetUser() actor: ActorUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationHistoryResponseDto> {
    const notification = await this.logRepository.findOne(id);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Ensure user can only access their own notifications
    if (notification.userId !== actor.id) {
      throw new NotFoundException('Notification not found');
    }

    return plainToInstance(NotificationHistoryResponseDto, notification);
  }
}
