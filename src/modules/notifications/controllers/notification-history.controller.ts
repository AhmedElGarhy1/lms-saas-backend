import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { NotificationLogRepository } from '../repositories/notification-log.repository';
import { GetNotificationHistoryDto } from '../dto/notification-history.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { NotificationLog } from '../entities/notification-log.entity';

@Controller('notifications/history')
@ApiTags('Notifications - History')
@ApiBearerAuth()
export class NotificationHistoryController {
  constructor(private readonly logRepository: NotificationLogRepository) {}

  @Get()
  @ApiOperation({ summary: 'Get user notification history with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Notification history retrieved successfully',
  })
  async getHistory(
    @GetUser() actor: ActorUser,
    @Query() query: GetNotificationHistoryDto,
  ): Promise<Pagination<NotificationLog>> {
    return this.logRepository.findUserHistory(actor.id, query);
  }
}
