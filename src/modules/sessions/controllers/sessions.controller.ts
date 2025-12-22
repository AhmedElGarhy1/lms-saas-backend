import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { PaginateSessionsDto } from '../dto/paginate-sessions.dto';
import { SessionIdParamDto } from '../dto/session-id-param.dto';
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
  @Permissions(PERMISSIONS.CLASSES.CREATE)
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

  @Get()
  @ApiOperation({ summary: 'Paginate sessions with filtering capabilities' })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
  })
  @Permissions(PERMISSIONS.CLASSES.READ)
  @SerializeOptions({ type: SessionResponseDto })
  async paginateSessions(
    @Query() paginateDto: PaginateSessionsDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.paginateSessions(
      paginateDto,
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
  @Permissions(PERMISSIONS.CLASSES.READ)
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
  @ApiOperation({ summary: 'Update a session' })
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
  @Permissions(PERMISSIONS.CLASSES.UPDATE)
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

  @Delete(':sessionId')
  @ApiOperation({
    summary: 'Delete a session',
    description:
      'Only extra sessions (isExtraSession: true) can be deleted. Scheduled sessions (isExtraSession: false) must be canceled instead.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Session cannot be deleted. Only extra sessions can be deleted. Scheduled sessions must be canceled instead.',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @Permissions(PERMISSIONS.CLASSES.DELETE)
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

  @Patch(':sessionId/cancel')
  @ApiOperation({ summary: 'Cancel a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session canceled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @Permissions(PERMISSIONS.CLASSES.UPDATE)
  @Transactional()
  @SerializeOptions({ type: SessionResponseDto })
  async cancelSession(
    @Param() params: SessionIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.sessionsService.cancelSession(
      params.sessionId,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.session' },
    });
  }
}
