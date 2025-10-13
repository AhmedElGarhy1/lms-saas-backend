import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ActivityLogService } from '../services/activity-log.service';
import { PaginateActivityLogsDto } from '../dto/paginate-activity-logs.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';

@ApiTags('Activity Logs')
@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated activity logs with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved successfully',
  })
  @Permissions(PERMISSIONS.ACTIVITY_LOG.VIEW)
  async getActivityLogs(@Query() query: PaginateActivityLogsDto) {
    return this.activityLogService.getActivityLogs(query);
  }
}
