import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
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
import { PaginateSessionsDto } from '../dto/paginate-sessions.dto';
import { SessionIdParamDto } from '../dto/session-id-param.dto';
import { TransitionStatusDto } from '../dto/transition-status.dto';
import { SessionStateMachine } from '../state-machines/session-state-machine';
import { Inject } from '@nestjs/common';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser, ManagerialOnly } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { SerializeOptions } from '@nestjs/common';
import { SessionResponseDto } from '../dto/session-response.dto';
import { NoContext } from '@/shared/common/decorators/no-context';

@ApiTags('Sessions')
@Controller('sessions')
@ManagerialOnly()
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionStateMachine: SessionStateMachine,
  ) {}

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
    return ControllerResponse.success(result);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sessions for a center with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
  })
  @Permissions(PERMISSIONS.SESSIONS.READ)
  @SerializeOptions({ type: SessionResponseDto })
  async paginateSessions(
    @Query() paginateDto: PaginateSessionsDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.paginateSessions(
      paginateDto,
      actor,
    );
    return ControllerResponse.success(result);
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
  // @Permissions(PERMISSIONS.SESSIONS.READ)
  @NoContext()
  async getCalendarSessions(
    @Query() calendarDto: CalendarSessionsDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.getCalendarSessions(
      calendarDto,
      actor,
    );
    return ControllerResponse.success(result);
  }

  @Get(':sessionId')
  @ApiOperation({
    summary: 'Get a specific session (real or virtual)',
    description:
      'Retrieves a session by ID. Accepts either a real session UUID or a virtual session ID from the calendar. Virtual sessions are constructed on-demand from schedule items.',
  })
  @ApiParam({
    name: 'sessionId',
    description:
      'Session ID - either a real session UUID or a virtual session ID (format: virtual|groupId|startTimeISO|scheduleItemId)',
  })
  @ApiResponse({
    status: 200,
    description: 'Session retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid session ID format',
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
    return ControllerResponse.success(result);
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
    return ControllerResponse.success(result);
  }

  @Patch(':sessionId/status')
  @ApiOperation({
    summary: 'Transition session status with business logic',
    description:
      'Unified endpoint for all session status changes with validation and side effects. Handles check-in, start, finish, cancel, and reschedule transitions. Triggers enrollment finalization automatically.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session status transitioned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or session state',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @Permissions(PERMISSIONS.SESSIONS.UPDATE)
  @Transactional()
  @SerializeOptions({ type: SessionResponseDto })
  async transitionStatus(
    @Param() params: SessionIdParamDto,
    @Body() dto: TransitionStatusDto,
    @GetUser() actor: ActorUser,
  ) {
    // Get current session to validate transition
    const currentSession = await this.sessionsService.getSession(
      params.sessionId,
      actor,
    );

    // Validate transition is allowed
    const transition = this.sessionStateMachine.getTransition(
      currentSession.status,
      dto.status,
    );
    if (!transition) {
      throw new Error(
        `Invalid status transition: ${currentSession.status} → ${dto.status}`,
      );
    }

    // Execute transition with side effects based on business logic
    switch (transition.businessLogic) {
      case 'checkInSession':
        return await this.handleCheckIn(params.sessionId, actor);
      case 'startSession':
        return await this.handleStart(params.sessionId, actor);
      case 'finishSession':
        return await this.handleFinish(params.sessionId, actor);
      case 'cancelSession':
        return await this.handleCancel(params.sessionId, actor);
      case 'scheduleSession':
        return await this.handleSchedule(params.sessionId, actor);
      default:
        throw new Error(`Unknown business logic: ${transition.businessLogic}`);
    }
  }

  private async handleCheckIn(sessionId: string, actor: ActorUser) {
    const result = await this.sessionsService.checkInSession(sessionId, actor);
    return ControllerResponse.success(result);
  }

  private async handleStart(sessionId: string, actor: ActorUser) {
    const result = await this.sessionsService.startSession(sessionId, actor);
    return ControllerResponse.success(result);
  }

  private async handleFinish(sessionId: string, actor: ActorUser) {
    const result = await this.sessionsService.finishSession(sessionId, actor);
    return ControllerResponse.success(result);
  }

  private async handleCancel(sessionId: string, actor: ActorUser) {
    const result = await this.sessionsService.cancelSession(sessionId, actor);
    return ControllerResponse.success(result);
  }

  private async handleSchedule(sessionId: string, actor: ActorUser) {
    const result = await this.sessionsService.scheduleSession(sessionId, actor);
    return ControllerResponse.success(result);
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
    return ControllerResponse.success(null);
  }

  // ===== BOOKING INTEGRATION ENDPOINTS =====
}
