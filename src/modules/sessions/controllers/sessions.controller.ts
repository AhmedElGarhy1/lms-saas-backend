import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { SessionsService } from '../services/sessions.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { CalendarSessionsDto } from '../dto/calendar-sessions.dto';
import { SessionIdParamDto } from '../dto/session-id-param.dto';
import { StartSessionDto } from '../dto/start-session.dto';
import { CancelSessionDto } from '../dto/cancel-session.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { SerializeOptions } from '@nestjs/common';
import { SessionResponseDto } from '../dto/session-response.dto';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  @ApiOperation({
    summary: 'Start a session (materialize virtual to real)',
    description:
      'Materializes a virtual session slot into a real database record for attendance tracking. Can only be started within 30 minutes before or anytime after the scheduled session time.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session started successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Too early to start session (>30 minutes before scheduled time) or no matching scheduled session found',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @Permissions(PERMISSIONS.SESSIONS.UPDATE)
  @Transactional()
  @SerializeOptions({ type: SessionResponseDto })
  async startSession(
    @Body() startSessionDto: StartSessionDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.startSession(
      startSessionDto.groupId,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.session' },
    });
  }

  @Post('cancel')
  @ApiOperation({
    summary: 'Cancel a session (create tombstone or update existing)',
    description:
      'Cancels a session by creating a tombstone record for virtual slots or updating existing real sessions to CANCELLED status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session cancelled successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @Permissions(PERMISSIONS.SESSIONS.UPDATE)
  @Transactional()
  @SerializeOptions({ type: SessionResponseDto })
  async cancelSession(
    @Body() cancelSessionDto: CancelSessionDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.cancelSession(
      cancelSessionDto.groupId,
      cancelSessionDto.scheduledStartTime,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.session' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create an extra/manual session' })
  @ApiResponse({
    status: 201,
    description: 'Session created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or conflict',
  })
  @Permissions(PERMISSIONS.SESSIONS.CREATE)
  @Transactional()
  @SerializeOptions({ type: SessionResponseDto })
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.createExtraSession(
      createSessionDto.groupId,
      createSessionDto,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.created',
      args: { resource: 't.resources.session' },
    });
  }

  @Get('calendar')
  @ApiOperation({
    summary: 'Get sessions for calendar view',
    description:
      'Returns sessions in calendar-friendly format. Date range is required and must not exceed 45 days.',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendar sessions retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid date range or filters',
  })
  @Permissions(PERMISSIONS.SESSIONS.READ)
  async getCalendarSessions(
    @Query() calendarDto: CalendarSessionsDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.getCalendarSessions(
      calendarDto,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.session' },
    });
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get a specific session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @Permissions(PERMISSIONS.SESSIONS.READ)
  @SerializeOptions({ type: SessionResponseDto })
  async getSession(
    @Param() params: SessionIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.getSession(
      params.sessionId,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.session' },
    });
  }

  @Put(':sessionId')
  @ApiOperation({
    summary: 'Update a session',
    description:
      'Update session title and times. Only SCHEDULED sessions can have their times changed.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or session cannot be updated',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @Permissions(PERMISSIONS.SESSIONS.UPDATE)
  @Transactional()
  @SerializeOptions({ type: SessionResponseDto })
  async updateSession(
    @Param() params: SessionIdParamDto,
    @Body() data: UpdateSessionDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.updateSession(
      params.sessionId,
      data,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.session' },
    });
  }

  @Post(':sessionId/finish')
  @ApiOperation({
    summary: 'Finish a session',
    description:
      'Marks a session as finished. Only allows transition from CONDUCTING to FINISHED status.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session finished successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Session is not in CONDUCTING status',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @Permissions(PERMISSIONS.SESSIONS.UPDATE)
  @Transactional()
  @SerializeOptions({ type: SessionResponseDto })
  async finishSession(
    @Param() params: SessionIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.finishSession(
      params.sessionId,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.session' },
    });
  }

  @Post(':sessionId/schedule')
  @ApiOperation({
    summary: 'Reschedule a canceled session',
    description:
      'Reschedules a previously canceled session. Only allows transition from CANCELED to SCHEDULED status.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session rescheduled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Session is not in CANCELED status',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @Permissions(PERMISSIONS.SESSIONS.UPDATE)
  @Transactional()
  @SerializeOptions({ type: SessionResponseDto })
  async scheduleSession(
    @Param() params: SessionIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.scheduleSession(
      params.sessionId,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.session' },
    });
  }

  @Delete(':sessionId')
  @ApiOperation({
    summary: 'Delete a session',
    description:
      'Only extra sessions (isExtraSession: true) can be deleted. Scheduled sessions (isExtraSession: false) should have their status updated to CANCELED instead of being deleted.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Session cannot be deleted. Only extra sessions can be deleted. Scheduled sessions should have their status updated to CANCELED instead.',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @Permissions(PERMISSIONS.SESSIONS.DELETE)
  @Transactional()
  async deleteSession(
    @Param() params: SessionIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.sessionsService.deleteSession(params.sessionId, actor);
    return ControllerResponse.message({
      key: 't.messages.deleted',
      args: { resource: 't.resources.session' },
    });
  }
}
