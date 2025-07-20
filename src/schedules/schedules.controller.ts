import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Logger,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { PermissionsGuard } from '../shared/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new class session' })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  @UseGuards(PermissionsGuard)
  @Permissions('schedules:create')
  async create(
    @Body() dto: CreateSessionDto,
    @GetUser() user: CurrentUserType,
  ): Promise<SessionResponseDto> {
    return this.schedulesService.createSession(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get class session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  @UseGuards(PermissionsGuard)
  @Permissions('schedules:read')
  async getById(
    @Param('id') id: string,
    @GetUser() user: CurrentUserType,
  ): Promise<SessionResponseDto> {
    return this.schedulesService.getSessionById(id, user);
  }

  @Get()
  @ApiOperation({ summary: 'List all class sessions' })
  @ApiResponse({ status: 200, description: 'List of class sessions' })
  async listSessions(@Paginate() query: PaginateQuery) {
    return this.schedulesService.listSessions(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update class session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  @UseGuards(PermissionsGuard)
  @Permissions('schedules:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @GetUser() user: CurrentUserType,
  ): Promise<SessionResponseDto> {
    return this.schedulesService.updateSession(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete class session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 204, description: 'Session deleted' })
  @UseGuards(PermissionsGuard)
  @Permissions('schedules:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @GetUser() user: CurrentUserType,
  ): Promise<void> {
    await this.schedulesService.deleteSession(id, user);
  }
}
