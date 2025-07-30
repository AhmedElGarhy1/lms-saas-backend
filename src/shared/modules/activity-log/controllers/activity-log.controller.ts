import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { ActivityLogService } from '../services/activity-log.service';
import { ActivityType, ActivityLevel } from '../entities/activity-log.entity';
import { Permissions } from '../../../../common/decorators/permissions.decorator';
import { GetUser } from '../../../../common/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../../../../common/types/current-user.type';
import { PaginationDocs } from '../../../../common/decorators/pagination-docs.decorator';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({
    summary: 'Get global activity logs',
    description:
      'Retrieve paginated global activity logs with filtering and search capabilities.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort fields' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter fields' })
  @PaginationDocs({
    searchFields: ['action', 'description'],
    exactFields: ['type', 'level', 'scope', 'actorId', 'centerId'],
  })
  @Permissions('activity-log:view')
  getGlobalActivityLogs(
    @Paginate() query: PaginateQuery,
    @GetUser() user: CurrentUserType,
  ) {
    return this.activityLogService.getGlobalActivityLogs(query);
  }

  @Get('center/:centerId')
  @ApiOperation({
    summary: 'Get center activity logs',
    description: 'Retrieve paginated activity logs for a specific center.',
  })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort fields' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter fields' })
  @PaginationDocs({
    searchFields: ['action', 'description'],
    exactFields: ['type', 'level', 'scope', 'actorId'],
  })
  @Permissions('activity-log:view')
  getCenterActivityLogs(
    @Param('centerId') centerId: string,
    @Paginate() query: PaginateQuery,
    @GetUser() user: CurrentUserType,
  ) {
    return this.activityLogService.getActivityLogsByCenter(centerId, query);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get user activity logs',
    description:
      'Retrieve paginated activity logs for a specific user (as actor or target).',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort fields' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter fields' })
  @PaginationDocs({
    searchFields: ['action', 'description'],
    exactFields: ['type', 'level', 'scope', 'centerId'],
  })
  @Permissions('activity-log:view')
  getUserActivityLogs(
    @Param('userId') userId: string,
    @Paginate() query: PaginateQuery,
    @GetUser() user: CurrentUserType,
  ) {
    return this.activityLogService.getActivityLogsByUser(userId, query);
  }

  @Get('type/:type')
  @ApiOperation({
    summary: 'Get activity logs by type',
    description: 'Retrieve paginated activity logs filtered by activity type.',
  })
  @ApiParam({
    name: 'type',
    description: 'Activity type',
    enum: ActivityType,
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort fields' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter fields' })
  @PaginationDocs({
    searchFields: ['action', 'description'],
    exactFields: ['level', 'scope', 'actorId', 'centerId'],
  })
  @Permissions('activity-log:view')
  getActivityLogsByType(
    @Param('type') type: ActivityType,
    @Paginate() query: PaginateQuery,
    @GetUser() user: CurrentUserType,
  ) {
    return this.activityLogService.getActivityLogsByType(type, query);
  }

  @Get('level/:level')
  @ApiOperation({
    summary: 'Get activity logs by level',
    description: 'Retrieve paginated activity logs filtered by activity level.',
  })
  @ApiParam({
    name: 'level',
    description: 'Activity level',
    enum: ActivityLevel,
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort fields' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter fields' })
  @PaginationDocs({
    searchFields: ['action', 'description'],
    exactFields: ['type', 'scope', 'actorId', 'centerId'],
  })
  @Permissions('activity-log:view')
  getActivityLogsByLevel(
    @Param('level') level: ActivityLevel,
    @Paginate() query: PaginateQuery,
    @GetUser() user: CurrentUserType,
  ) {
    return this.activityLogService.getActivityLogsByLevel(level, query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get activity statistics',
    description:
      'Retrieve activity statistics for global or center-specific data.',
  })
  @ApiQuery({
    name: 'centerId',
    required: false,
    description: 'Center ID for center-specific stats',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity statistics retrieved successfully',
  })
  @Permissions('activity-log:view')
  getActivityStats(
    @Query('centerId') centerId?: string,
    @GetUser() user?: CurrentUserType,
  ) {
    return this.activityLogService.getActivityStats(centerId);
  }

  @Get('stats/center/:centerId')
  @ApiOperation({
    summary: 'Get center activity statistics',
    description: 'Retrieve activity statistics for a specific center.',
  })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiResponse({
    status: 200,
    description: 'Center activity statistics retrieved successfully',
  })
  @Permissions('activity-log:view')
  getCenterActivityStats(
    @Param('centerId') centerId: string,
    @GetUser() user: CurrentUserType,
  ) {
    return this.activityLogService.getActivityStats(centerId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get activity log by ID',
    description: 'Retrieve a specific activity log by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Activity log ID' })
  @ApiResponse({
    status: 200,
    description: 'Activity log retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Activity log not found',
  })
  @Permissions('activity-log:view')
  getActivityLogById(
    @Param('id') id: string,
    @GetUser() user: CurrentUserType,
  ) {
    return this.activityLogService.getActivityLogById(id);
  }
}
