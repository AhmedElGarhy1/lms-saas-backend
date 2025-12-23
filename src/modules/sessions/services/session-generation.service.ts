import { Injectable } from '@nestjs/common';
import { SessionsRepository } from '../repositories/sessions.repository';
import { SessionValidationService } from './session-validation.service';
import { BaseService } from '@/shared/common/services/base.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import {
  SessionsBulkCreatedEvent,
  SessionConflictDetectedEvent,
} from '../events/session.events';
import { Session } from '../entities/session.entity';
import { DayOfWeek } from '@/modules/classes/enums/day-of-week.enum';
import { SessionStatus } from '../enums/session-status.enum';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { TimezoneService } from '@/shared/common/services/timezone.service';
import { format, addMonths, addDays, addMinutes, max, min } from 'date-fns';
import { TZDate } from '@date-fns/tz';

@Injectable()
export class SessionGenerationService extends BaseService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly sessionValidationService: SessionValidationService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly groupsRepository: GroupsRepository,
  ) {
    super();
  }

  /**
   * Generate sessions for a group within a date range
   * @param groupId - Group ID
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @param actor - Actor performing the action
   */
  async generateSessionsForGroup(
    groupId: string,
    startDate: Date,
    endDate: Date,
    actor: ActorUser,
  ): Promise<Session[]> {
    // Fetch group with class and scheduleItems using repository
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
      'class',
      'scheduleItems',
    ]);

    const classEntity = group.class;
    if (!classEntity) {
      // This should not happen as repository loads the relation
      throw new Error('Class relation not loaded for group');
    }

    // Cap endDate to class endDate if it exists
    let effectiveEndDate = endDate;
    if (classEntity.endDate) {
      effectiveEndDate = TimezoneService.fromTimestamp(
        Math.min(endDate.getTime(), classEntity.endDate.getTime()),
      );
    }

    // If effective end date is before start date, nothing to generate
    if (effectiveEndDate < startDate) {
      return [];
    }

    const scheduleItems = group.scheduleItems;
    if (!scheduleItems || scheduleItems.length === 0) {
      // No schedule items, nothing to generate
      return [];
    }

    const teacherUserProfileId = classEntity.teacherUserProfileId;
    const duration = classEntity.duration; // Duration in minutes

    const sessionsToCreate: Partial<Session>[] = [];

    // Generate sessions for each schedule item
    for (const scheduleItem of scheduleItems) {
      const dates = this.getDatesForDayOfWeek(
        startDate,
        effectiveEndDate,
        scheduleItem.day,
      );

      for (const date of dates) {
        // Calculate startTime and endTime using timezone-aware conversion
        // Get the date string in center timezone (not UTC) to correctly handle
        // cases where late-night times cross midnight in UTC
        const timezone = TimezoneService.getTimezoneFromContext();
        const zonedDate = new TZDate(date, timezone);
        const dateStr = format(zonedDate, 'yyyy-MM-dd');
        const sessionStartTime = TimezoneService.toUtc(
          dateStr,
          scheduleItem.startTime,
        );

        const sessionEndTime = addMinutes(sessionStartTime, duration);

        // Check for teacher conflict
        const conflict =
          await this.sessionValidationService.validateTeacherConflict(
            teacherUserProfileId,
            sessionStartTime,
            sessionEndTime,
          );

        if (conflict) {
          // Emit conflict detection event
          await this.typeSafeEventEmitter.emitAsync(
            SessionEvents.CONFLICT_DETECTED,
            new SessionConflictDetectedEvent(
              groupId,
              scheduleItem.id,
              sessionStartTime,
              sessionEndTime,
              'TEACHER' as const,
              conflict.sessionId,
              conflict.startTime,
              conflict.endTime,
              actor,
              String(actor.centerId),
            ),
          );
          // Skip this session if there's a conflict
          continue;
        }

        // Check for duplicate (same groupId + startTime)
        const existingSessions = await this.sessionsRepository.findByGroupId(
          groupId,
          {
            startTimeFrom: sessionStartTime,
            startTimeTo: sessionStartTime,
          },
        );

        if (existingSessions.length > 0) {
          // Skip if duplicate exists
          continue;
        }

        sessionsToCreate.push({
          groupId,
          scheduleItemId: scheduleItem.id,
          startTime: sessionStartTime,
          endTime: sessionEndTime,
          status: SessionStatus.SCHEDULED,
          isExtraSession: false,
        });
      }
    }

    // If no sessions to create (all skipped due to conflicts/duplicates or date range issues), return empty array
    if (sessionsToCreate.length === 0) {
      return [];
    }

    // Bulk insert sessions
    // Note: bulkInsert automatically populates createdBy from RequestContext
    const createdSessions =
      await this.sessionsRepository.bulkInsert(sessionsToCreate);

    // Emit single bulk event for all created sessions
    if (createdSessions.length > 0) {
      await this.typeSafeEventEmitter.emitAsync(
        SessionEvents.BULK_CREATED,
        new SessionsBulkCreatedEvent(createdSessions, actor, actor.centerId!),
      );
    }

    return createdSessions;
  }

  /**
   * Generate initial sessions for a group (2 months from class.startDate or current date)
   * Called when a class transitions from NOT_STARTED to ACTIVE
   * Will not generate sessions beyond the class endDate if it exists
   * @param groupId - Group ID
   * @param actor - Actor performing the action
   */
  async generateInitialSessionsForGroup(
    groupId: string,
    actor: ActorUser,
  ): Promise<Session[]> {
    // Fetch group with class to get startDate using repository
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
      'class',
    ]);

    const classEntity = group.class;
    const now = TimezoneService.getZonedNowFromContext();
    const startDate = max([
      classEntity.startDate,
      now, // Use current date if startDate is in the past
    ]);

    const endDate = addMonths(startDate, 2); // 2 months ahead

    // Cap endDate to class endDate if it exists
    let effectiveEndDate = endDate;
    if (classEntity.endDate) {
      effectiveEndDate = TimezoneService.fromTimestamp(
        Math.min(endDate.getTime(), classEntity.endDate.getTime()),
      );
    }

    return this.generateSessionsForGroup(
      groupId,
      startDate,
      effectiveEndDate,
      actor,
    );
  }

  /**
   * Generate buffer sessions for a group (4 weeks if buffer < 4 weeks)
   * Calculates required sessions based on schedule items count
   * Will not generate sessions beyond the class endDate if it exists
   * @param groupId - Group ID
   * @param actor - Actor performing the action
   */
  async generateBufferSessionsForGroup(
    groupId: string,
    actor: ActorUser,
  ): Promise<Session[]> {
    // Fetch group with class and scheduleItems to calculate required buffer
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
      'class',
      'scheduleItems',
    ]);

    const scheduleItems = group.scheduleItems;
    if (!scheduleItems || scheduleItems.length === 0) {
      // No schedule items, nothing to generate
      return [];
    }

    // Calculate required sessions: scheduleItemsCount * 4 weeks
    // Each schedule item generates 1 session per week, so 4 weeks = 4 sessions per item
    const requiredSessions = scheduleItems.length * 4;

    const now = TimezoneService.getZonedNowFromContext();
    const fourWeeksFromNow = addDays(now, 28); // 4 weeks = 28 days

    // Check if we have enough future sessions
    const futureSessions = await this.sessionsRepository.findByGroupId(
      groupId,
      {
        startTimeFrom: now,
        startTimeTo: fourWeeksFromNow,
      },
    );

    if (futureSessions.length >= requiredSessions) {
      // Already have enough sessions
      return [];
    }

    // Generate sessions up to 4 weeks from now
    const latestSession =
      futureSessions.length > 0
        ? futureSessions[futureSessions.length - 1]
        : null;

    const startDate = latestSession ? latestSession.startTime : now;
    // Start from next day after latest session (or now if no sessions)
    // This ensures we don't regenerate existing sessions
    const effectiveStartDate = addDays(startDate, 1);

    const endDate = addDays(now, 28); // 4 weeks = 28 days

    // Cap endDate to class endDate if it exists
    let effectiveEndDate = endDate;
    const classEntity = group.class;
    if (classEntity?.endDate) {
      effectiveEndDate = min([endDate, classEntity.endDate]);
    }

    return this.generateSessionsForGroup(
      groupId,
      effectiveStartDate,
      effectiveEndDate,
      actor,
    );
  }

  /**
   * Get all dates for a specific day of week within a date range
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @param dayOfWeek - Day of week (Mon, Tue, Wed, etc.)
   * @returns Array of dates matching the day of week
   */
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
    // Clone startDate to avoid mutating the original (addDays returns new Date, so this is safe)
    let currentDate = startDate;

    while (currentDate <= endDate) {
      // Use timezone-aware day of week to match schedule items (which are in center timezone)
      if (TimezoneService.getDayOfWeek(currentDate) === targetDay) {
        // addDays returns a new Date, so we can safely push currentDate directly
        dates.push(currentDate);
      }
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  }
}
