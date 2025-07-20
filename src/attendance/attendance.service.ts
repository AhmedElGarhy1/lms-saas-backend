import {
  Injectable,
  NotFoundException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { BulkMarkAttendanceDto } from './dto/bulk-mark-attendance.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PaginateQuery } from 'nestjs-paginate';
import {
  BasePaginationService,
  PaginationResult,
} from '../shared/services/base-pagination.service';

@Injectable()
export class AttendanceService extends BasePaginationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private toResponseDto(record: any): any {
    return {
      id: record.id,
      sessionId: record.sessionId,
      studentId: record.studentId,
      status: record.status,
      note: record.note,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async bulkMark(dto: BulkMarkAttendanceDto, userId: string) {
    const { sessionId, attendances } = dto;

    // Validate session exists
    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Create attendance records
    const createdAttendances = await this.prisma.attendance.createMany({
      data: attendances.map((attendance) => ({
        sessionId,
        studentId: attendance.studentId,
        status: attendance.status,
        note: attendance.note,
        markedById: userId,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      `Bulk attendance marked for session ${sessionId} by user ${userId}`,
    );

    return {
      message: 'Attendance marked successfully',
      count: createdAttendances.count,
    };
  }

  async edit(dto: UpdateAttendanceDto, userId: string) {
    const { id, status, note } = dto;

    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id },
      data: {
        status,
        note,
      },
    });

    this.logger.log(`Attendance ${id} updated by user ${userId}`);

    return this.toResponseDto(updatedAttendance);
  }

  async fetch(query: PaginateQuery): Promise<PaginationResult<any>> {
    return this.executePaginatedQuery(query, {
      model: this.prisma.attendance,
      include: { student: true, session: true },
      exactFields: ['sessionId', 'studentId'],
      enumFields: [{ field: 'status', targetField: 'status' }],
      searchFields: [{ field: 'note', targetField: 'note' }],
      dateRangeField: 'createdAt',
    });
  }

  /**
   * Generate attendance report/analytics.
   */
  async report(query: PaginateQuery) {
    const groupBy = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: {
        sessionId:
          query.filter &&
          typeof query.filter === 'object' &&
          'sessionId' in query.filter
            ? (query.filter.sessionId as string)
            : undefined,
        studentId:
          query.filter &&
          typeof query.filter === 'object' &&
          'studentId' in query.filter
            ? (query.filter.studentId as string)
            : undefined,
      },
      _count: { status: true },
    });

    // Use custom conditions for date filtering on 'date' field instead of 'createdAt'
    const customConditions = (query: PaginateQuery) => {
      const where: any = {};

      if (
        query.filter &&
        typeof query.filter === 'object' &&
        'dateFrom' in query.filter
      ) {
        const dateFromRaw = query.filter.dateFrom;
        const dateFrom = Array.isArray(dateFromRaw)
          ? dateFromRaw[0]
          : dateFromRaw;
        if (typeof dateFrom === 'string' && dateFrom.length > 0) {
          where.AND = where.AND || [];
          where.AND.push({ date: { gte: new Date(dateFrom) } });
        }
      }

      if (
        query.filter &&
        typeof query.filter === 'object' &&
        'dateTo' in query.filter
      ) {
        const dateToRaw = query.filter.dateTo;
        const dateTo = Array.isArray(dateToRaw) ? dateToRaw[0] : dateToRaw;
        if (typeof dateTo === 'string' && dateTo.length > 0) {
          where.AND = where.AND || [];
          where.AND.push({ date: { lte: new Date(dateTo) } });
        }
      }

      return Object.keys(where).length > 0 ? where : undefined;
    };

    return this.executePaginatedQuery(query, {
      model: this.prisma.attendance,
      include: { student: true, session: true },
      exactFields: ['sessionId', 'studentId'],
      customConditions,
    });
  }

  async listAttendance(
    query: PaginateQuery,
    currentUser: any,
  ): Promise<PaginationResult<any>> {
    // Use custom conditions for date filtering on 'date' field
    const customConditions = (query: PaginateQuery) => {
      const where: any = {};

      if (query.filter?.dateFrom || query.filter?.dateTo) {
        where.AND = [];
        if (query.filter?.dateFrom) {
          const dateFromRaw = query.filter.dateFrom;
          const dateFrom = Array.isArray(dateFromRaw)
            ? dateFromRaw[0]
            : dateFromRaw;
          if (typeof dateFrom === 'string' && dateFrom.length > 0) {
            where.AND.push({ date: { gte: new Date(dateFrom) } });
          }
        }
        if (query.filter?.dateTo) {
          const dateToRaw = query.filter.dateTo;
          const dateTo = Array.isArray(dateToRaw) ? dateToRaw[0] : dateToRaw;
          if (typeof dateTo === 'string' && dateTo.length > 0) {
            where.AND.push({ date: { lte: new Date(dateTo) } });
          }
        }
      }

      return Object.keys(where).length > 0 ? where : undefined;
    };

    return this.executePaginatedQueryWithTransaction(query, {
      prisma: this.prisma,
      model: this.prisma.attendance,
      include: { student: true, session: true },
      exactFields: ['sessionId', 'studentId'],
      enumFields: [{ field: 'status', targetField: 'status' }],
      searchFields: [{ field: 'note', targetField: 'note' }],
      customConditions,
    });
  }
}
