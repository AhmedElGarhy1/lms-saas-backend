import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import {
  BulkMarkAttendanceDto,
  AttendanceStatus,
} from './dto/bulk-mark-attendance.dto';
import { EditAttendanceDto } from './dto/edit-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { AttendanceResponseDto } from './dto/attendance-response.dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  constructor(private readonly prisma: PrismaService) {}

  private toResponseDto(record: any): AttendanceResponseDto {
    return {
      id: record.id,
      sessionId: record.sessionId,
      studentId: record.studentId,
      status: record.status,
      note: record.note,
      markedById: record.markedById,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Bulk mark attendance for a session.
   * Prevents duplicate entries for the same session/student.
   */
  async bulkMark(dto: BulkMarkAttendanceDto, userId: string) {
    this.logger.log(
      `User ${userId} bulk marking attendance for session ${dto.sessionId}`,
    );
    const existing = await this.prisma.attendance.findMany({
      where: {
        sessionId: dto.sessionId,
        studentId: { in: dto.attendances.map((a) => a.studentId) },
      },
    });
    if (existing.length > 0) {
      this.logger.warn(
        `Duplicate attendance detected for session ${dto.sessionId}: ${existing.map((e) => e.studentId).join(', ')}`,
      );
      throw new BadRequestException(
        'Some students already have attendance marked for this session.',
      );
    }
    try {
      const created = await this.prisma.attendance.createMany({
        data: dto.attendances.map((a) => ({
          sessionId: dto.sessionId,
          studentId: a.studentId,
          status: a.status,
          note: a.note,
          markedById: userId,
        })),
      });
      this.logger.log(
        `Attendance marked for ${created.count} students in session ${dto.sessionId}`,
      );
      return { count: created.count };
    } catch (error) {
      this.logger.error(`Failed to bulk mark attendance: ${error.message}`);
      throw new BadRequestException('Failed to mark attendance.');
    }
  }

  /**
   * Edit an attendance record (status/note).
   */
  async edit(dto: EditAttendanceDto, userId: string) {
    this.logger.log(`User ${userId} editing attendance ${dto.id}`);
    let attendance;
    try {
      attendance = await this.prisma.attendance.update({
        where: { id: dto.id },
        data: {
          status: dto.status,
          note: dto.note,
          markedById: userId,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Edit failed for attendance ${dto.id}: ${error.message}`,
      );
      if (error.code === 'P2025') {
        throw new NotFoundException('Attendance record not found.');
      }
      throw new BadRequestException('Failed to update attendance.');
    }
    return this.toResponseDto(attendance);
  }

  /**
   * Fetch attendance records with filters.
   */
  async fetch(query: QueryAttendanceDto) {
    const records = await this.prisma.attendance.findMany({
      where: {
        sessionId: query.sessionId,
        studentId: query.studentId,
        status: query.status,
        createdAt:
          query.dateFrom || query.dateTo
            ? {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined,
              }
            : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!records.length) {
      this.logger.warn('No attendance records found for query.');
      throw new NotFoundException('No attendance records found.');
    }
    return records.map(this.toResponseDto);
  }

  /**
   * Generate attendance report/analytics.
   */
  async report(query: QueryAttendanceDto) {
    const groupBy = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: {
        sessionId: query.sessionId,
        studentId: query.studentId,
      },
      _count: { status: true },
    });
    if (!groupBy.length) {
      this.logger.warn('No attendance data found for report.');
      throw new NotFoundException('No attendance data found for report.');
    }
    return groupBy;
  }
}
