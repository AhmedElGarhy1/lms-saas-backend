import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ActivityLogService } from '../services/activity-log.service';

@ApiTags('Activity Logs')
@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Post()
  @ApiOperation({ summary: 'Create activity log' })
  @ApiResponse({ status: 201, description: 'Activity log created' })
  async createActivityLog(@Body() dto: any) {
    return this.activityLogService.createActivityLog(dto);
  }

  @Post('clear')
  @ApiOperation({ summary: 'Clear all activity logs' })
  @ApiResponse({ status: 200, description: 'All activity logs cleared' })
  async clearAllLogs() {
    await this.activityLogService.clearAllLogs();
    return { message: 'All activity logs cleared' };
  }
}
