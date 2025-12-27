import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { AttendanceService } from '../services/attendance.service';
import { ScanAttendanceDto } from '../dto/scan-attendance.dto';
import { ManualAttendanceDto } from '../dto/manual-attendance.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { SerializeOptions } from '@nestjs/common';
import { AttendanceResponseDto } from '../dto/attendance-response.dto';
import { AttendanceSessionIdParamDto } from '../dto/session-id-param.dto';
import { SessionRosterStudentDto } from '../dto/session-roster-response.dto';
import { PaginateSessionRosterDto } from '../dto/paginate-session-roster.dto';
import { SessionAttendanceStatsDto } from '../dto/session-attendance-stats.dto';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('scan')
  @ApiOperation({
    summary: 'Scan attendance (present/late) for a student in a session',
  })
  @ApiResponse({ status: 200, description: 'Attendance recorded successfully' })
  @Permissions(PERMISSIONS.SESSIONS.UPDATE)
  @Transactional()
  @SerializeOptions({ type: AttendanceResponseDto })
  async scan(@Body() dto: ScanAttendanceDto, @GetUser() actor: ActorUser) {
    const result = await this.attendanceService.scan(
      dto.sessionId,
      dto.studentCode,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.session' },
    });
  }

  @Post('manual')
  @ApiOperation({
    summary: 'Manually mark attendance for a student in a session',
  })
  @ApiResponse({ status: 200, description: 'Attendance recorded successfully' })
  @Permissions(PERMISSIONS.SESSIONS.UPDATE)
  @Transactional()
  @SerializeOptions({ type: AttendanceResponseDto })
  async manual(@Body() dto: ManualAttendanceDto, @GetUser() actor: ActorUser) {
    const result = await this.attendanceService.manualMark(
      dto.sessionId,
      dto.studentCode,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.session' },
    });
  }

  @Get('sessions/:sessionId/roster')
  @ApiOperation({ summary: 'Get session roster with attendance (if any)' })
  @ApiResponse({ status: 200, description: 'Roster retrieved successfully' })
  @Permissions(PERMISSIONS.SESSIONS.READ)
  @SerializeOptions({ type: SessionRosterStudentDto })
  async roster(
    @Param() params: AttendanceSessionIdParamDto,
    @Query() query: PaginateSessionRosterDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.attendanceService.getSessionRoster(
      params.sessionId,
      query,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.session' },
    });
  }

  @Get('sessions/:sessionId/stats')
  @ApiOperation({ summary: 'Get session attendance stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  @Permissions(PERMISSIONS.SESSIONS.READ)
  @SerializeOptions({ type: SessionAttendanceStatsDto })
  async stats(
    @Param() params: AttendanceSessionIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.attendanceService.getSessionAttendanceStats(
      params.sessionId,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.session' },
    });
  }
}
