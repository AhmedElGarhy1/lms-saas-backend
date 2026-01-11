import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { addMinutes, addDays, startOfDay, getDay } from 'date-fns';
import { RequestContext } from '@/shared/common/context/request.context';
import { Locale } from '@/shared/common/enums/locale.enum';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';
import { Session } from '../entities/session.entity';
import { ScheduleItem } from '@/modules/classes/entities/schedule-item.entity';
import { ClassStatus } from '@/modules/classes/enums/class-status.enum';
import { DayOfWeek } from '@/modules/classes/enums/day-of-week.enum';
import { TimezoneService } from '@/shared/common/services/timezone.service';
import { DEFAULT_TIMEZONE } from '@/shared/common/constants/timezone.constants';
import { SessionStatus } from '../enums/session-status.enum';
import { ATTENDANCE_LATE_GRACE_MINUTES } from '@/modules/attendance/constants/attendance.constants';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';

type ScheduleItemForCleanup = {
  id: string;
  groupId: string;
  centerId: string;
  branchId: string;
  classId: string;
  day: DayOfWeek;
  startTime: string; // HH:mm
  classDuration: number;
  classStartDate: Date;
  classEndDate: Date | null;
  centerTimezone: string | null;
};

// TODO: make it work correctly
@Injectable()
export class SessionsCleanupJob {
  private readonly logger = new Logger(SessionsCleanupJob.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(ScheduleItem)
    private readonly scheduleItemRepo: Repository<ScheduleItem>,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async cleanup(): Promise<void> {
    const startMs = Date.now();
    const jobId = `sessions-cleanup:${new Date().toISOString()}`;

    this.logger.log('Starting sessions cleanup job', { jobId });

    try {
      await RequestContext.run(
        {
          userId: SYSTEM_USER_ID,
          locale: Locale.EN,
        },
        async () => {
          const now = new Date();
          const windowEnd = new Date(now.getTime() - 60 * 60 * 1000); // now - 1h
          const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000); // look back 48h

          const insertedMissed = await this.materializeMissedVirtualSessions(
            windowStart,
            windowEnd,
            now,
          );

          const updatedScheduledToMissed =
            await this.markStaleScheduledSessionsAsMissed(now);

          // Removed auto-finishing: await this.updatePastSessions(now);
          // Teachers now manually finish sessions with complete attendance tracking

          this.logger.log('Sessions cleanup job completed', {
            jobId,
            durationMs: Date.now() - startMs,
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
            graceMinutes: ATTENDANCE_LATE_GRACE_MINUTES,
            insertedMissed,
            updatedScheduledToMissed,
          });
        },
      );
    } catch (error) {
      this.logger.error(
        'Sessions cleanup job failed',
        error instanceof Error ? error.stack : String(error),
        {
          jobId,
          durationMs: Date.now() - startMs,
        },
      );
      throw error;
    }
  }

  private async materializeMissedVirtualSessions(
    windowStart: Date,
    windowEnd: Date,
    now: Date,
  ): Promise<number> {
    // Pull schedule items for ACTIVE classes only (and non-deleted classes)
    // We use raw projection to avoid loading full graphs.
    const rows = await this.scheduleItemRepo
      .createQueryBuilder('si')
      .innerJoin('si.class', 'c')
      .innerJoin('si.center', 'center')
      .where('c.status = :active', { active: ClassStatus.ACTIVE })
      .andWhere('c.deletedAt IS NULL')
      .select([
        'si.id as "id"',
        'si.groupId as "groupId"',
        'si.centerId as "centerId"',
        'si.branchId as "branchId"',
        'si.classId as "classId"',
        'si.day as "day"',
        'si.startTime as "startTime"',
        'c.duration as "classDuration"',
        'c.startDate as "classStartDate"',
        'c.endDate as "classEndDate"',
        'center.timezone as "centerTimezone"',
      ])
      .getRawMany<ScheduleItemForCleanup>();

    if (!rows.length) return 0;

    const candidates: Array<Partial<Session>> = [];
    const seen = new Set<string>();

    for (const si of rows) {
      const classStart = new Date(si.classStartDate);
      const classEnd = si.classEndDate ? new Date(si.classEndDate) : null;

      const effectiveStart = new Date(
        Math.max(windowStart.getTime(), classStart.getTime()),
      );
      let effectiveEnd = windowEnd;
      if (classEnd) {
        effectiveEnd = new Date(
          Math.min(windowEnd.getTime(), classEnd.getTime()),
        );
      }
      if (effectiveEnd <= effectiveStart) continue;

      const dates = this.getDatesForDayOfWeek(
        effectiveStart,
        effectiveEnd,
        si.day,
      );
      const timezone = si.centerTimezone || DEFAULT_TIMEZONE;

      for (const date of dates) {
        const startTime = TimezoneService.combineDateAndTime(
          date,
          si.startTime,
          timezone,
        );
        if (startTime.getTime() < windowStart.getTime()) continue;
        if (startTime.getTime() >= windowEnd.getTime()) continue;

        // Normalize to seconds to match existing virtual-session matching behavior
        const normalized = new Date(
          Math.floor(startTime.getTime() / 1000) * 1000,
        );
        const key = `${si.groupId}:${normalized.getTime()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const endTime = addMinutes(normalized, si.classDuration);

        candidates.push({
          groupId: si.groupId,
          centerId: si.centerId,
          branchId: si.branchId,
          classId: si.classId,
          scheduleItemId: si.id,
          startTime: normalized,
          endTime,
          status: SessionStatus.MISSED,
          isExtraSession: false,
          actualStartTime: undefined,
          actualFinishTime: undefined,
          createdAt: now,
          updatedAt: now,
          createdByProfileId: SYSTEM_USER_ID,
          updatedByProfileId: undefined,
        });
      }
    }

    if (!candidates.length) return 0;

    // Insert idempotently: unique constraint on (groupId, startTime) will prevent duplicates.
    const chunkSize = 500;
    let insertedTotal = 0;

    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);
      const res = await this.sessionRepo
        .createQueryBuilder()
        .insert()
        .into(Session)
        .values(chunk)
        .orIgnore()
        .execute();
      insertedTotal += res.identifiers?.length ?? 0;
    }

    this.logger.log(
      `Virtual cleanup: inserted ${insertedTotal} MISSED sessions (candidates=${candidates.length})`,
    );
    return insertedTotal;
  }

  /**
   * Mark scheduled sessions that haven't been started after their start time + grace period as MISSED
   * This handles sessions that were created but never transitioned from SCHEDULED status
   */
  private async markStaleScheduledSessionsAsMissed(now: Date): Promise<number> {
    const gracePeriodMs = 60 * 60 * 1000; // 1 hour grace period after start time
    const cutoffTime = new Date(now.getTime() - gracePeriodMs);

    // Find sessions that are still SCHEDULED but their start time + grace period has passed
    const staleScheduledSessions = await this.sessionRepo.find({
      where: {
        status: SessionStatus.SCHEDULED,
        startTime: LessThanOrEqual(cutoffTime),
      },
      select: ['id'],
    });

    if (staleScheduledSessions.length === 0) {
      return 0;
    }

    const sessionIds = staleScheduledSessions.map((session) => session.id);

    // Update status to MISSED
    const updateResult = await this.sessionRepo.update(
      { id: In(sessionIds) },
      {
        status: SessionStatus.MISSED,
        updatedAt: now,
        updatedByProfileId: SYSTEM_USER_ID,
      },
    );

    const updatedCount = updateResult.affected || 0;

    this.logger.log(
      `Marked ${updatedCount} stale scheduled sessions as MISSED (cutoff: ${cutoffTime.toISOString()})`,
    );

    return updatedCount;
  }

  private getDatesForDayOfWeek(
    startDate: Date,
    endDate: Date,
    dayOfWeek: DayOfWeek,
  ): Date[] {
    const dates: Date[] = [];
    const dayMap: Record<DayOfWeek, number> = {
      [DayOfWeek.MON]: 1,
      [DayOfWeek.TUE]: 2,
      [DayOfWeek.WED]: 3,
      [DayOfWeek.THU]: 4,
      [DayOfWeek.FRI]: 5,
      [DayOfWeek.SAT]: 6,
      [DayOfWeek.SUN]: 0,
    };

    const targetDay = dayMap[dayOfWeek];
    let currentDate = startOfDay(startDate);

    while (currentDate.getTime() < endDate.getTime()) {
      if (getDay(currentDate) === targetDay) {
        dates.push(currentDate);
      }
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  }
}
