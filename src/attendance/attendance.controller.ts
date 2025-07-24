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
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import {
  CreateAttendanceRequestSchema,
  CreateAttendanceRequestDto,
} from './dto/create-attendance.dto';
import { UpdateAttendanceRequestDto } from './dto/update-attendance.dto';
import { BulkMarkAttendanceRequestDto } from './dto/bulk-mark-attendance.dto';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser } from '../shared/types/current-user.type';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { EditAttendanceRequestDto } from './dto/edit-attendance.dto';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';
import { PaginationDocs } from '../shared/decorators/pagination-docs.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('bulk-mark')
  @ApiOperation({ summary: 'Bulk mark attendance for a session' })
  @ApiBody({
    type: BulkMarkAttendanceRequestDto,
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
    @Body() dto: BulkMarkAttendanceRequestDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.attendanceService.bulkMark(dto, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new attendance record' })
  @ApiBody({ type: CreateAttendanceRequestDto })
  @ApiResponse({ status: 201, description: 'Attendance created' })
  async createAttendance(
    @Body(new ZodValidationPipe(CreateAttendanceRequestSchema))
    dto: CreateAttendanceRequestDto,
  ) {
    return this.attendanceService.createAttendance(dto);
  }

  @Patch('edit')
  @ApiOperation({ summary: 'Edit an attendance record' })
  @ApiBody({
    type: EditAttendanceRequestDto,
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
    @Body() dto: EditAttendanceRequestDto,
    @GetUser() user: CurrentUser,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.edit(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an attendance record' })
  @ApiBody({ type: UpdateAttendanceRequestDto })
  @ApiResponse({ status: 200, description: 'Attendance updated' })
  async updateAttendance(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceRequestDto,
  ) {
    return this.attendanceService.updateAttendance(id, dto);
  }

  @Get()
  @PaginationDocs({
    searchFields: ['note'],
    exactFields: ['sessionId', 'studentId'],
    enumFields: ['status'],
    dateRangeFields: ['createdAt'],
  })
  @ApiOperation({ summary: 'List attendance records' })
  @ApiResponse({
    status: 200,
    description: 'List of attendance records',
  })
  @UseGuards(PermissionsGuard)
  @Permissions('attendance:read')
  async list(@Paginate() query: PaginateQuery, @GetUser() user: CurrentUser) {
    return this.attendanceService.listAttendance(query, user);
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
  async report(@Query() query: any) {
    return this.attendanceService.report(query);
  }
}
