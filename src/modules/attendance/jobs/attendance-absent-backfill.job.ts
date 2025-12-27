import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestContext } from '@/shared/common/context/request.context';
import { Locale } from '@/shared/common/enums/locale.enum';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';
import {
  ATTENDANCE_ABSENT_BACKFILL_BATCH_SIZE,
  ATTENDANCE_ABSENT_BACKFILL_WINDOW_HOURS,
} from '../constants/attendance.jobs.constants';
import { Session } from '@/modules/sessions/entities/session.entity';
import { SessionStatus } from '@/modules/sessions/enums/session-status.enum';
import { AttendanceStatus } from '../enums/attendance-status.enum';
import { Attendance } from '../entities/attendance.entity';

@Injectable()
export class AttendanceAbsentBackfillJob {
  private readonly logger = new Logger(AttendanceAbsentBackfillJob.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
  ) {}

  @Cron('*/30 * * * *')
  async backfillAbsents(): Promise<void> {
    const startMs = Date.now();
    const jobId = `attendance-absent-backfill:${new Date().toISOString()}`;

    this.logger.log('Starting attendance ABSENT backfill job', {
      jobId,
      windowHours: ATTENDANCE_ABSENT_BACKFILL_WINDOW_HOURS,
      batchSize: ATTENDANCE_ABSENT_BACKFILL_BATCH_SIZE,
    });

    try {
      await RequestContext.run(
        {
          userId: SYSTEM_USER_ID,
          locale: Locale.EN,
        },
        async () => {
          const now = new Date();
          const windowStart = new Date(
            now.getTime() -
              ATTENDANCE_ABSENT_BACKFILL_WINDOW_HOURS * 60 * 60 * 1000,
          );

          let offset = 0;
          let totalSessions = 0;
          let totalInserted = 0;

          while (true) {
            const sessions = await this.sessionRepo
              .createQueryBuilder('s')
              .select(['s.id', 's.endTime'])
              .where('s.status = :status', { status: SessionStatus.FINISHED })
              .andWhere('s."endTime" >= :windowStart', { windowStart })
              .andWhere('s."endTime" < :now', { now })
              .orderBy('s."endTime"', 'ASC')
              .offset(offset)
              .limit(ATTENDANCE_ABSENT_BACKFILL_BATCH_SIZE)
              .getMany();

            if (sessions.length === 0) break;

            for (const s of sessions) {
              totalSessions += 1;
              totalInserted += await this.insertAbsentForMissingStudents(s.id);
            }

            offset += ATTENDANCE_ABSENT_BACKFILL_BATCH_SIZE;
            if (sessions.length < ATTENDANCE_ABSENT_BACKFILL_BATCH_SIZE) break;
          }

          this.logger.log('Attendance ABSENT backfill job completed', {
            jobId,
            durationMs: Date.now() - startMs,
            windowStart: windowStart.toISOString(),
            windowEnd: now.toISOString(),
            sessionsProcessed: totalSessions,
            inserted: totalInserted,
          });
        },
      );
    } catch (error) {
      this.logger.error(
        'Attendance ABSENT backfill job failed',
        error instanceof Error ? error.stack : String(error),
        {
          jobId,
          durationMs: Date.now() - startMs,
        } as any,
      );
      throw error;
    }
  }

  private async insertAbsentForMissingStudents(
    sessionId: string,
  ): Promise<number> {
    // Single SQL, idempotent via unique constraint (sessionId, studentUserProfileId)
    const result = await this.attendanceRepo.manager.query<{
      rowCount?: number;
    }>(
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
        s."centerId",
        s."branchId",
        s."groupId",
        s.id,
        gs."studentUserProfileId",
        $2::varchar as "status",
        NULL as "lastScannedAt",
        false as "isManuallyMarked",
        $3::uuid as "markedByUserProfileId",
        $3::uuid as "createdBy",
        NULL as "updatedBy"
      FROM "sessions" s
      INNER JOIN "group_students" gs
        ON gs."groupId" = s."groupId"
        AND gs."leftAt" IS NULL
      WHERE s.id = $1::uuid
        AND s.status = $4::varchar
        AND NOT EXISTS (
          SELECT 1
          FROM "attendance" a
          WHERE a."sessionId" = s.id
            AND a."studentUserProfileId" = gs."studentUserProfileId"
        )
      ON CONFLICT ("sessionId", "studentUserProfileId") DO NOTHING;
      `,
      [
        sessionId,
        AttendanceStatus.ABSENT,
        SYSTEM_USER_ID,
        SessionStatus.FINISHED,
      ],
    );

    return typeof result?.rowCount === 'number' ? result.rowCount : 0;
  }
}
