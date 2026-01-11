import { Injectable } from '@nestjs/common';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { ScheduleItem } from '@/modules/classes/entities/schedule-item.entity';
import { Group } from '@/modules/classes/entities/group.entity';
import { Session } from '../entities/session.entity';
import { SessionStatus } from '../enums/session-status.enum';
import { TimezoneService } from '@/shared/common/services/timezone.service';
import { DEFAULT_TIMEZONE } from '@/shared/common/constants/timezone.constants';
import { addMinutes, getDay, addDays, startOfDay } from 'date-fns';
import { DayOfWeek } from '@/modules/classes/enums/day-of-week.enum';

/**
 * Virtual session interface for sessions calculated from schedule items
 */
export interface VirtualSession {
  id: undefined;
  groupId: string;
  scheduleItemId: string;
  title?: string;
  startTime: Date;
  endTime: Date;
  status: SessionStatus;
  isExtraSession: boolean;
}

/**
 * Merged session type - either virtual or real
 */
export type MergedSession = Session | VirtualSession;

/**
 * Service responsible for session virtualization logic
 * Handles calculation, merging, and resolution of virtual sessions
 */
@Injectable()
export class SessionVirtualizationService {
  constructor(private readonly groupsRepository: GroupsRepository) {}

  /**
   * Calculate virtual sessions from schedule items
   * @param scheduleItems - Schedule items to calculate sessions from
   * @param groupMap - Map of groups with class relations loaded
   * @param startDate - Start date (inclusive, UTC)
   * @param endDate - End date (exclusive, UTC)
   * @returns Array of virtual sessions
   */
  calculateVirtualSessions(
    scheduleItems: ScheduleItem[],
    groupMap: Map<string, Group>,
    startDate: Date,
    endDate: Date,
  ): VirtualSession[] {
    const virtualSessions: VirtualSession[] = [];

    for (const scheduleItem of scheduleItems) {
      const group = groupMap.get(scheduleItem.groupId);
      if (!group || !group.class) {
        continue; // Skip if group/class not found
      }

      const classEntity = group.class;

      // Effective start date should be the later of query startDate or class startDate
      const effectiveStartDate = new Date(
        Math.max(startDate.getTime(), classEntity.startDate.getTime()),
      );

      // Cap endDate to class endDate if it exists
      let effectiveEndDate = endDate;
      if (classEntity.endDate) {
        effectiveEndDate = new Date(
          Math.min(endDate.getTime(), classEntity.endDate.getTime()),
        );
      }

      // If effective end date is before effective start date, skip
      if (effectiveEndDate <= effectiveStartDate) {
        continue;
      }

      // Get all dates matching the day of week in the range (starting from class startDate)
      const dates = this.getDatesForDayOfWeek(
        effectiveStartDate,
        effectiveEndDate,
        scheduleItem.day,
      );

      for (const date of dates) {
        // Fetch Center's timezone from entity relationship (Group → Class → Center)
        // Fallback to DEFAULT_TIMEZONE if center timezone is not available
        const timezone = group.class.center?.timezone || DEFAULT_TIMEZONE;

        // Calculate startTime: Convert social time (HH:mm in center timezone) to physical UTC
        // date is UTC Date, scheduleItem.startTime is HH:mm string in center timezone
        const sessionStartTime = TimezoneService.combineDateAndTime(
          date,
          scheduleItem.startTime,
          timezone,
        );

        // Calculate endTime using UTC math (adding minutes to UTC startTime)
        // This correctly handles sessions that cross calendar day boundaries
        // UTC math is universal: 60 minutes is 60 minutes everywhere
        const sessionEndTime = addMinutes(
          sessionStartTime,
          classEntity.duration,
        );

        virtualSessions.push({
          id: undefined,
          groupId: scheduleItem.groupId,
          scheduleItemId: scheduleItem.id,
          title: undefined,
          startTime: sessionStartTime,
          endTime: sessionEndTime,
          status: SessionStatus.SCHEDULED,
          isExtraSession: false,
        });
      }
    }

    return virtualSessions;
  }

  /**
   * Get all dates for a specific day of week within a date range
   * Uses timezone-aware day matching to ensure schedule items match correctly
   *
   * @param startDate - Start date (inclusive, UTC)
   * @param endDate - End date (exclusive, UTC)
   * @param dayOfWeek - Day of week enum
   * @returns Array of UTC Date objects for matching days
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
    let currentDate = startOfDay(startDate);

    // endDate is exclusive, so we continue while currentDate < endDate
    while (currentDate.getTime() < endDate.getTime()) {
      // Use date-fns getDay() on UTC dates (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
      if (getDay(currentDate) === targetDay) {
        dates.push(new Date(currentDate));
      }
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  }

  /**
   * Merge real and virtual sessions
   * Real sessions override virtual ones for the same time slot (same groupId + startTime)
   *
   * @param realSessions - Real sessions from database
   * @param virtualSessions - Virtual sessions calculated from schedule items
   * @returns Merged array of sessions, sorted by startTime
   */
  mergeSessions(
    realSessions: Session[],
    virtualSessions: VirtualSession[],
  ): MergedSession[] {
    const mergedMap = new Map<string, MergedSession>();

    // Add all virtual sessions to map (keyed by groupId + startTime in milliseconds)
    for (const virtualSession of virtualSessions) {
      const key = this.getSessionKey(
        virtualSession.groupId,
        virtualSession.startTime,
      );
      mergedMap.set(key, virtualSession);
    }

    // Override with real sessions where they exist
    for (const realSession of realSessions) {
      const key = this.getSessionKey(
        realSession.groupId,
        realSession.startTime,
      );
      mergedMap.set(key, realSession as MergedSession);
    }

    // Convert map values to array and sort by startTime
    return Array.from(mergedMap.values()).sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );
  }

  /**
   * Generate a unique key for a session based on groupId and startTime
   * Used to match virtual and real sessions for merging
   *
   * @param groupId - Group ID
   * @param startTime - Session start time
   * @returns Unique key string
   */
  private getSessionKey(groupId: string, startTime: Date): string {
    return `${groupId}:${startTime.getTime()}`;
  }
}
