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
        endDate,
        scheduleItem.day,
      );

      for (const date of dates) {
        // Calculate startTime and endTime
        const [hours, minutes] = scheduleItem.startTime.split(':').map(Number);
        const sessionStartTime = new Date(date);
        sessionStartTime.setHours(hours, minutes, 0, 0);

        const sessionEndTime = new Date(sessionStartTime);
        sessionEndTime.setMinutes(sessionEndTime.getMinutes() + duration);

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

    // Bulk insert sessions
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
    const startDate = new Date(
      Math.max(
        classEntity.startDate.getTime(),
        new Date().getTime(), // Use current date if startDate is in the past
      ),
    );

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 2); // 2 months ahead

    return this.generateSessionsForGroup(groupId, startDate, endDate, actor);
  }

  /**
   * Generate buffer sessions for a group (4 weeks if buffer < 4 weeks)
   * Calculates required sessions based on schedule items count
   * @param groupId - Group ID
   * @param actor - Actor performing the action
   */
  async generateBufferSessionsForGroup(
    groupId: string,
    actor: ActorUser,
  ): Promise<Session[]> {
    // Fetch group with scheduleItems to calculate required buffer
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
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

    const now = new Date();
    const fourWeeksFromNow = new Date(now);
    fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28); // 4 weeks = 28 days

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

    const startDate = latestSession
      ? new Date(latestSession.startTime)
      : new Date();
    startDate.setDate(startDate.getDate() + 1); // Start from next day

    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 28); // 4 weeks = 28 days

    return this.generateSessionsForGroup(groupId, startDate, endDate, actor);
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
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (currentDate.getDay() === targetDay) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }
}
