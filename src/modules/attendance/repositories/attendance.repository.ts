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
  isManuallyMarked: boolean | null;
  lastScannedAt: string | Date | null;
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

  async findRosterWithAttendance(params: {
    sessionId: string;
    groupId: string;
  }): Promise<
    Array<{
      studentUserProfileId: string;
      fullName: string;
      studentCode?: string;
      attendanceId?: string;
      attendanceStatus?: AttendanceStatus;
      isManuallyMarked?: boolean;
      lastScannedAt?: Date;
    }>
  > {
    const { sessionId, groupId } = params;
    const result = await this.getEntityManager().query<RosterRow[]>(
      `
      SELECT
        gs."studentUserProfileId" as "studentUserProfileId",
        u.name as "fullName",
        up."code" as "studentCode",
        a.id as "attendanceId",
        a.status as "attendanceStatus",
        a."isManuallyMarked" as "isManuallyMarked",
        a."lastScannedAt" as "lastScannedAt"
      FROM "group_students" gs
      INNER JOIN "user_profiles" up ON up.id = gs."studentUserProfileId"
      INNER JOIN "users" u ON u.id = up."userId"
      LEFT JOIN "attendance" a
        ON a."sessionId" = $1::uuid
        AND a."studentUserProfileId" = gs."studentUserProfileId"
      WHERE gs."groupId" = $2::uuid
        AND gs."leftAt" IS NULL
      ORDER BY u.name ASC
      `,
      [sessionId, groupId],
    );

    return (result || []).map((row) => ({
      studentUserProfileId: row.studentUserProfileId,
      fullName: row.fullName,
      studentCode: row.studentCode || undefined,
      attendanceId: row.attendanceId || undefined,
      attendanceStatus: row.attendanceStatus || undefined,
      isManuallyMarked:
        typeof row.isManuallyMarked === 'boolean'
          ? row.isManuallyMarked
          : (row.isManuallyMarked ?? undefined),
      lastScannedAt: row.lastScannedAt
        ? new Date(row.lastScannedAt)
        : undefined,
    }));
  }

  async paginateRosterWithAttendance(params: {
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
      attendanceId?: string;
      attendanceStatus?: AttendanceStatus;
      isManuallyMarked?: boolean;
      lastScannedAt?: Date;
    }>
  > {
    const { sessionId, groupId } = params;
    const page = params.page || 1;
    const limit = Math.min(params.limit || 10, 100);
    const skip = (page - 1) * limit;
    const search = params.search?.trim();

    const countWhereSql =
      'gs."groupId" = $1::uuid AND gs."leftAt" IS NULL' +
      (search ? ' AND (u.name ILIKE $2 OR up."code" ILIKE $2)' : '');

    const countArgs: string[] = [groupId];
    if (search) countArgs.push(`%${search}%`);

    const countResult = await this.getEntityManager().query<
      Array<{ count: number }>
    >(
      `
      SELECT COUNT(*)::int as "count"
      FROM "group_students" gs
      INNER JOIN "user_profiles" up ON up.id = gs."studentUserProfileId"
      INNER JOIN "users" u ON u.id = up."userId"
      WHERE ${countWhereSql}
      `,
      countArgs,
    );
    const totalItems = Number(countResult?.[0]?.count || 0);

    const dataWhereSql =
      'gs."groupId" = $2::uuid AND gs."leftAt" IS NULL' +
      (search ? ' AND (u.name ILIKE $3 OR up."code" ILIKE $3)' : '');

    const dataArgs: Array<string | number> = [sessionId, groupId];
    if (search) dataArgs.push(`%${search}%`);
    dataArgs.push(limit, skip);

    const limitIndex = dataArgs.length - 1;
    const offsetIndex = dataArgs.length;

    const result = await this.getEntityManager().query<RosterRow[]>(
      `
      SELECT
        gs."studentUserProfileId" as "studentUserProfileId",
        u.name as "fullName",
        up."code" as "studentCode",
        a.id as "attendanceId",
        a.status as "attendanceStatus",
        a."isManuallyMarked" as "isManuallyMarked",
        a."lastScannedAt" as "lastScannedAt"
      FROM "group_students" gs
      INNER JOIN "user_profiles" up ON up.id = gs."studentUserProfileId"
      INNER JOIN "users" u ON u.id = up."userId"
      LEFT JOIN "attendance" a
        ON a."sessionId" = $1::uuid
        AND a."studentUserProfileId" = gs."studentUserProfileId"
      WHERE ${dataWhereSql}
      ORDER BY u.name ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      dataArgs,
    );

    const items = (result || []).map((row) => ({
      studentUserProfileId: row.studentUserProfileId,
      fullName: row.fullName,
      studentCode: row.studentCode || undefined,
      attendanceId: row.attendanceId || undefined,
      attendanceStatus: row.attendanceStatus || undefined,
      isManuallyMarked:
        typeof row.isManuallyMarked === 'boolean'
          ? row.isManuallyMarked
          : (row.isManuallyMarked ?? undefined),
      lastScannedAt: row.lastScannedAt
        ? new Date(row.lastScannedAt)
        : undefined,
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

  /**
   * Bulk insert ABSENT records for students in a group who do not yet have an attendance record.
   * Idempotent via unique constraint on (sessionId, studentUserProfileId).
   *
   * Uses raw SQL for performance and ON CONFLICT DO NOTHING for safety.
   */
  async bulkInsertAbsentForMissingStudents(params: {
    sessionId: string;
    groupId: string;
    centerId: string;
    branchId: string;
    createdByUserId: string;
    markedByUserProfileId: string;
  }): Promise<number> {
    const {
      sessionId,
      groupId,
      centerId,
      branchId,
      createdByUserId,
      markedByUserProfileId,
    } = params;

    const result = await this.getEntityManager().query<{ rowCount?: number }>(
      `
      INSERT INTO "attendance" (
        "centerId",
        "branchId",
        "groupId",
        "sessionId",
        "studentUserProfileId",
        "status",
        "lastScannedAt",
        "isManuallyMarked",
        "markedByUserProfileId",
        "createdBy",
        "updatedBy"
      )
      SELECT
        $3::uuid as "centerId",
        $4::uuid as "branchId",
        gs."groupId" as "groupId",
        $1::uuid as "sessionId",
        gs."studentUserProfileId" as "studentUserProfileId",
        $7::varchar as "status",
        NULL as "lastScannedAt",
        false as "isManuallyMarked",
        $6::uuid as "markedByUserProfileId",
        $5::uuid as "createdBy",
        NULL as "updatedBy"
      FROM "group_students" gs
      WHERE gs."groupId" = $2::uuid
        AND gs."leftAt" IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "attendance" a
          WHERE a."sessionId" = $1::uuid
            AND a."studentUserProfileId" = gs."studentUserProfileId"
        )
      ON CONFLICT ("sessionId", "studentUserProfileId") DO NOTHING;
      `,
      [
        sessionId,
        groupId,
        centerId,
        branchId,
        createdByUserId,
        markedByUserProfileId,
        AttendanceStatus.ABSENT,
      ],
    );

    // node-postgres returns rowCount, but TypeORM manager.query returns driver-specific result.
    // For INSERT ... SELECT, Postgres returns an object with rowCount when using pg directly.
    // We’ll fall back to 0 if not present.
    return typeof result?.rowCount === 'number' ? result.rowCount : 0;
  }

  async getSessionAttendanceStats(params: {
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
        SELECT COUNT(*)::int AS "totalStudents"
        FROM "group_students" gs
        WHERE gs."groupId" = $1::uuid
          AND gs."leftAt" IS NULL
      ),
      counts AS (
        SELECT
          COUNT(*) FILTER (WHERE a.status = 'PRESENT')::int AS "present",
          COUNT(*) FILTER (WHERE a.status = 'LATE')::int AS "late",
          COUNT(*) FILTER (WHERE a.status = 'EXCUSED')::int AS "excused",
          COUNT(*)::int AS "recorded"
        FROM "attendance" a
        INNER JOIN "group_students" gs
          ON gs."studentUserProfileId" = a."studentUserProfileId"
          AND gs."groupId" = $1::uuid
          AND gs."leftAt" IS NULL
        WHERE a."sessionId" = $2::uuid
      )
      SELECT
        r."totalStudents" AS "totalStudents",
        COALESCE(c."present", 0) AS "present",
        COALESCE(c."late", 0) AS "late",
        COALESCE(c."excused", 0) AS "excused",
        GREATEST(r."totalStudents" - COALESCE(c."recorded", 0), 0)::int AS "absent"
      FROM roster r
      CROSS JOIN counts c
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
}
