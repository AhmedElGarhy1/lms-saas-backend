import {
  Body,
  Controller,
  Post,
  Patch,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { BulkMarkAttendanceDto } from './dto/bulk-mark-attendance.dto';
import { EditAttendanceDto } from './dto/edit-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser } from '../shared/types/current-user.type';
import { PermissionsGuard } from '../shared/guards/permissions.guard';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('bulk-mark')
  @ApiOperation({ summary: 'Bulk mark attendance for a session' })
  @ApiBody({
    type: BulkMarkAttendanceDto,
    examples: {
      default: {
        value: {
          sessionId: 'session-uuid',
          attendances: [
            { studentId: 'student-uuid', status: 'PRESENT', note: 'On time' },
            { studentId: 'student-uuid2', status: 'ABSENT' },
          ],
          markedById: 'user-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Attendance marked',
    schema: { example: { count: 2 } },
  })
  @ApiResponse({
    status: 400,
    description:
      'Some students already have attendance marked for this session.',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async bulkMark(
    @Body() dto: BulkMarkAttendanceDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.attendanceService.bulkMark(dto, user.id);
  }

  @Patch('edit')
  @ApiOperation({ summary: 'Edit an attendance record' })
  @ApiBody({
    type: EditAttendanceDto,
    examples: {
      default: {
        value: {
          id: 'attendance-uuid',
          status: 'LATE',
          note: 'Arrived 10 minutes late',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Attendance updated',
    schema: {
      example: {
        id: 'attendance-uuid',
        sessionId: 'session-uuid',
        studentId: 'student-uuid',
        status: 'LATE',
        note: 'Arrived 10 minutes late',
        markedById: 'user-uuid',
        createdAt: '2024-07-18T10:00:00.000Z',
        updatedAt: '2024-07-18T10:10:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Failed to update attendance.' })
  @ApiResponse({ status: 404, description: 'Attendance record not found.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async edit(
    @Body() dto: EditAttendanceDto,
    @GetUser() user: CurrentUser,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.edit(dto, user.id);
  }

  @Get('fetch')
  @ApiOperation({ summary: 'Fetch attendance records' })
  @ApiResponse({
    status: 200,
    description: 'Attendance records',
    schema: {
      example: [
        {
          id: 'attendance-uuid',
          sessionId: 'session-uuid',
          studentId: 'student-uuid',
          status: 'PRESENT',
          note: 'On time',
          markedById: 'user-uuid',
          createdAt: '2024-07-18T10:00:00.000Z',
          updatedAt: '2024-07-18T10:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 404, description: 'No attendance records found.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async fetch(
    @Query() query: QueryAttendanceDto,
  ): Promise<AttendanceResponseDto[]> {
    return this.attendanceService.fetch(query);
  }

  @Get('report')
  @ApiOperation({ summary: 'Attendance report/analytics' })
  @ApiResponse({
    status: 200,
    description: 'Attendance report',
    schema: {
      example: [
        { status: 'PRESENT', _count: { status: 10 } },
        { status: 'ABSENT', _count: { status: 2 } },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No attendance data found for report.',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async report(@Query() query: QueryAttendanceDto) {
    return this.attendanceService.report(query);
  }
}
