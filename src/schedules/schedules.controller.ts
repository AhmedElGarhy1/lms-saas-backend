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
  BadRequestException,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import {
  CreateSessionRequestSchema,
  CreateSessionRequestDto,
} from './dto/create-session.dto';
import {
  UpdateSessionRequestSchema,
  UpdateSessionRequestDto,
} from './dto/update-session.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { PermissionsGuard } from '../shared/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';
import { PaginationDocs } from '../shared/decorators/pagination-docs.decorator';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new class session' })
  @ApiBody({ type: CreateSessionRequestDto })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(
    @Body(new ZodValidationPipe(CreateSessionRequestSchema))
    dto: CreateSessionRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
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
  @PaginationDocs({
    searchFields: ['title', 'description'],
    exactFields: ['centerId', 'subjectId', 'teacherId'],
    dateRangeFields: ['startTime', 'endTime'],
  })
  @ApiOperation({ summary: 'List sessions' })
  @ApiResponse({
    status: 200,
    description: 'List of sessions',
  })
  async listSessions(@Paginate() query: PaginateQuery) {
    return this.schedulesService.listSessions(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a class session' })
  @ApiBody({ type: UpdateSessionRequestDto })
  @ApiResponse({ status: 200, description: 'Session updated' })
  async updateSession(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSessionRequestSchema))
    dto: UpdateSessionRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
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
