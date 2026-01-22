import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Attendance } from '../entities/attendance.entity';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { AttendanceStatus } from '../enums/attendance-status.enum';
import { Pagination } from '@/shared/common/types/pagination.types';

interface RosterRow {
  studentUserProfileId: string;
  fullName: string;
  studentCode: string | null;
  attendanceId: string | null;
  attendanceStatus: AttendanceStatus | null;
}

@Injectable()
export class AttendanceRepository extends BaseRepository<Attendance> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Attendance {
    return Attendance;
  }

  async findBySessionAndStudent(
    sessionId: string,
    studentUserProfileId: string,
  ): Promise<Attendance | null> {
    return this.getRepository().findOne({
      where: { sessionId, studentUserProfileId },
    });
  }

  async findBySessionId(sessionId: string): Promise<Attendance[]> {
    return this.getRepository().find({
      where: { sessionId },
    });
  }

  async countAttendanceByStudentAndClass(
    studentUserProfileId: string,
    classId: string,
    sinceDate?: Date,
  ): Promise<number> {
    let query = this.getRepository()
      .createQueryBuilder('attendance')
      .leftJoin('attendance.session', 'session')
      .where('attendance.studentUserProfileId = :studentId', {
        studentId: studentUserProfileId,
      })
      .andWhere('session.classId = :classId', { classId });

    if (sinceDate) {
      query = query.andWhere('attendance.createdAt >= :sinceDate', {
        sinceDate,
      });
    }

    return query.getCount();
  }

  async paginateRosterWithAttendance(params: {
    sessionId: string;
    groupId: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: AttendanceStatus;
  }): Promise<
    Pagination<{
      studentUserProfileId: string;
      fullName: string;
      studentCode?: string;
      attendanceId?: string;
      attendanceStatus?: AttendanceStatus;
    }>
  > {
    const { sessionId, groupId, status } = params;
    const page = params.page || 1;
    const limit = Math.min(params.limit || 10, 100);
    const skip = (page - 1) * limit;
    const search = params.search?.trim();

    // Build query builder for attendance records with relations
    let queryBuilder = this.getEntityManager()
      .createQueryBuilder('attendance', 'a')
      // Join relations for name/code fields only (not full entities)
      .leftJoin('a.student', 'up')
      .leftJoin('up.user', 'u')
      // Add name and code fields as selections
      .addSelect([
        'up.id',
        'up.code',
        'u.id',
        'u.name',
      ])
      .where('a.sessionId = :sessionId', { sessionId })
      .andWhere('a.groupId = :groupId', { groupId });

    // Add status filter if provided
    if (status) {
      queryBuilder = queryBuilder.andWhere('a.status = :status', {
        status,
      });
    }

    // Add search filter if provided
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(u.name ILIKE :search OR up.code ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Get total count
    const totalItems = await queryBuilder.getCount();

    // Add ordering and pagination to data query
    queryBuilder = queryBuilder
      .orderBy('a.createdAt', 'ASC')
      .skip(skip)
      .take(limit);

    // Execute query and get entities
    const attendanceRecords = await queryBuilder.getMany();

    // Map entities to response format
    const items = attendanceRecords.map((attendance) => ({
      studentUserProfileId: attendance.studentUserProfileId,
      fullName: attendance.student?.user?.name || 'Unknown Student',
      studentCode: attendance.student?.code || undefined,
      attendanceId: attendance.id,
      attendanceStatus: attendance.status,
    }));

    const totalPages = Math.ceil(totalItems / limit);
    const route = `/attendance/sessions/${sessionId}/roster`;
    const buildLink = (pageNum?: number): string => {
      if (pageNum === undefined) return `${route}?limit=${limit}`;
      return `${route}?page=${pageNum}&limit=${limit}`;
    };

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
      links: {
        first: buildLink(),
        last: buildLink(totalPages),
        next: page < totalPages ? buildLink(page + 1) : '',
        previous: page > 1 ? buildLink(page - 1) : '',
      },
    };
  }

  async calculateSessionAttendanceStats(params: {
    sessionId: string;
    groupId: string;
  }): Promise<{
    totalStudents: number;
    present: number;
    late: number;
    excused: number;
    absent: number; // missing record count
  }> {
    const { sessionId, groupId } = params;

    const result = await this.getEntityManager().query<
      Array<{
        totalStudents: number;
        present: number;
        late: number;
        excused: number;
        absent: number;
      }>
    >(
      `
      WITH roster AS (
        SELECT COUNT(*)::int AS total
        FROM "group_students"
        WHERE "groupId" = $1::uuid
          AND "leftAt" IS NULL
      ),
      counts AS (
        SELECT
          COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
          COUNT(*) FILTER (WHERE status = 'LATE')::int AS late,
          COUNT(*) FILTER (WHERE status = 'EXCUSED')::int AS excused,
          COUNT(*) FILTER (WHERE status = 'ABSENT')::int AS absent
        FROM "attendance"
        WHERE "sessionId" = $2::uuid
      )
      SELECT
        r.total AS "totalStudents",
        c.present,
        c.late,
        c.excused,
        c.absent
      FROM roster r, counts c
      `,
      [groupId, sessionId],
    );

    const row = result?.[0];
    return {
      totalStudents: Number(row?.totalStudents || 0),
      present: Number(row?.present || 0),
      late: Number(row?.late || 0),
      excused: Number(row?.excused || 0),
      absent: Number(row?.absent || 0),
    };
  }

  async paginateUnmarkedStudents(params: {
    sessionId: string;
    groupId: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<
    Pagination<{
      studentUserProfileId: string;
      fullName: string;
      studentCode?: string;
    }>
  > {
    const { sessionId, groupId, search } = params;
    const page = params.page || 1;
    const limit = Math.min(params.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query to count total unmarked students
    let countQuery = this.getEntityManager()
      .createQueryBuilder('group_students', 'gs')
      .innerJoin(
        'user_profiles',
        'up',
        'up.id = gs.studentUserProfileId AND up.deletedAt IS NULL',
      )
      .innerJoin('users', 'u', 'u.id = up.userId AND u.deletedAt IS NULL')
      .leftJoin(
        'attendance',
        'a',
        'a.sessionId = :sessionId AND a.studentUserProfileId = gs.studentUserProfileId',
        { sessionId },
      )
      .where('gs.groupId = :groupId', { groupId })
      .andWhere('gs.leftAt IS NULL')
      .andWhere('a.studentUserProfileId IS NULL');

    // Add search filter if provided
    if (search) {
      countQuery = countQuery.andWhere(
        '(u.name ILIKE :search OR up.code ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    const totalItems = await countQuery.getCount();

    // Build query for paginated data
    let dataQuery = this.getEntityManager()
      .createQueryBuilder('group_students', 'gs')
      .select([
        'gs.studentUserProfileId as studentUserProfileId',
        'u.name as fullName',
        'up.code as studentCode',
      ])
      .innerJoin(
        'user_profiles',
        'up',
        'up.id = gs.studentUserProfileId AND up.deletedAt IS NULL',
      )
      .innerJoin('users', 'u', 'u.id = up.userId AND u.deletedAt IS NULL')
      .leftJoin(
        'attendance',
        'a',
        'a.sessionId = :sessionId AND a.studentUserProfileId = gs.studentUserProfileId',
        { sessionId },
      )
      .where('gs.groupId = :groupId', { groupId })
      .andWhere('gs.leftAt IS NULL')
      .andWhere('a.studentUserProfileId IS NULL');

    // Add search filter if provided
    if (search) {
      dataQuery = dataQuery.andWhere(
        '(u.name ILIKE :search OR up.code ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    // Add ordering and pagination
    dataQuery = dataQuery.orderBy('u.name', 'ASC').skip(skip).take(limit);

    const rawResults = await dataQuery.getRawMany();

    // Map to response format
    const items = rawResults.map((row: any) => ({
      studentUserProfileId: row.studentuserprofileid,
      fullName: row.fullname,
      studentCode: row.studentcode || undefined,
    }));

    const totalPages = Math.ceil(totalItems / limit);
    const route = `/attendance/sessions/${sessionId}/unmarked-students`;
    const buildLink = (pageNum?: number): string => {
      if (pageNum === undefined) return `${route}?limit=${limit}`;
      return `${route}?page=${pageNum}&limit=${limit}`;
    };

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
      links: {
        first: buildLink(),
        last: buildLink(totalPages),
        next: page < totalPages ? buildLink(page + 1) : '',
        previous: page > 1 ? buildLink(page - 1) : '',
      },
    };
  }

  /**
   * Find an attendance record with optimized relations loaded
   * Only loads id and name fields for related entities
   *
   * @param attendanceId - Attendance ID
   * @param includeDeleted - Whether to include soft-deleted attendance records
   * @returns Attendance with optimized relations
   */
  async findAttendanceWithRelations(attendanceId: string, includeDeleted: boolean = false): Promise<Attendance | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('attendance')
      // Join relations for name fields only (not full entities)
      .leftJoin('attendance.student', 'student')
      .leftJoin('student.user', 'studentUser')
      .leftJoin('attendance.session', 'session')
      .leftJoin('attendance.group', 'group')
      .leftJoin('attendance.branch', 'branch')
      // Audit relations
      .leftJoin('attendance.creator', 'creator')
      .leftJoin('creator.user', 'creatorUser')
      .leftJoin('attendance.updater', 'updater')
      .leftJoin('updater.user', 'updaterUser')
      // Add name and id fields as selections
      .addSelect([
        'student.id',
        'student.code',
        'studentUser.id',
        'studentUser.name',
        'session.id',
        'group.id',
        'group.name',
        'branch.id',
        'branch.city',
        // Audit fields
        'creator.id',
        'creatorUser.id',
        'creatorUser.name',
        'updater.id',
        'updaterUser.id',
        'updaterUser.name',
      ])
      .where('attendance.id = :attendanceId', { attendanceId });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getOne();
  }

  /**
   * Find an attendance record with optimized relations loaded or throw if not found
   *
   * @param attendanceId - Attendance ID
   * @param includeDeleted - Whether to include soft-deleted attendance records
   * @returns Attendance with optimized relations
   * @throws Attendance not found error
   */
  async findAttendanceWithRelationsOrThrow(attendanceId: string, includeDeleted: boolean = false): Promise<Attendance> {
    const attendance = await this.findAttendanceWithRelations(attendanceId, includeDeleted);
    if (!attendance) {
      throw new Error(`Attendance record with id ${attendanceId} not found`);
    }
    return attendance;
  }
}
