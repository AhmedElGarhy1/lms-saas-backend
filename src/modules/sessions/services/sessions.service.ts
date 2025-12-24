import { Injectable } from '@nestjs/common';
import { SessionsRepository } from '../repositories/sessions.repository';
import { SessionValidationService } from './session-validation.service';
import { BaseService } from '@/shared/common/services/base.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import {
  SessionCreatedEvent,
  SessionUpdatedEvent,
  SessionDeletedEvent,
  SessionCanceledEvent,
} from '../events/session.events';
import { Session } from '../entities/session.entity';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { CalendarSessionsDto } from '../dto/calendar-sessions.dto';
import { SessionStatus } from '../enums/session-status.enum';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { Transactional } from '@nestjs-cls/transactional';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { TimezoneService } from '@/shared/common/services/timezone.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassAccessService } from '@/modules/classes/services/class-access.service';
import { addMinutes, addDays, startOfDay, subMinutes } from 'date-fns';
import { ScheduleItemsRepository } from '@/modules/classes/repositories/schedule-items.repository';
import { ScheduleItem } from '@/modules/classes/entities/schedule-item.entity';
import { DayOfWeek } from '@/modules/classes/enums/day-of-week.enum';
import {
  CalendarSessionsResponseDto,
  CalendarSessionItem,
} from '../dto/calendar-sessions-response.dto';
import { Group } from '@/modules/classes/entities/group.entity';

/**
 * Virtual session interface for sessions calculated from schedule items
 */
interface VirtualSession {
  id: undefined;
  groupId: string;
  scheduleItemId: string;
  title?: undefined;
  startTime: Date; // UTC
  endTime: Date; // UTC
  status: SessionStatus.SCHEDULED;
  isExtraSession: false;
}

/**
 * Merged session type - either virtual or real
 */
type MergedSession = Session | VirtualSession;

@Injectable()
export class SessionsService extends BaseService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly sessionValidationService: SessionValidationService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly groupsRepository: GroupsRepository,
    private readonly branchAccessService: BranchAccessService,
    private readonly classAccessService: ClassAccessService,
    private readonly scheduleItemsRepository: ScheduleItemsRepository,
  ) {
    super();
  }

  /**
   * Create an extra/manual session
   * @param groupId - Group ID
   * @param createSessionDto - Session data
   * @param actor - Actor performing the action
   */
  @Transactional()
  async createExtraSession(
    groupId: string,
    createSessionDto: CreateSessionDto,
    actor: ActorUser,
  ): Promise<Session> {
    // DTO validation (@BelongsToBranch decorator) already ensures group belongs to actor's branch
    // Fetch group with class to get teacherUserProfileId and denormalized fields for snapshot
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
      'class',
    ]);

    // Validate class staff access (for STAFF users)
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    const teacherUserProfileId = group.class.teacherUserProfileId;

    // startTime is already a UTC Date object (converted by @IsIsoDateTime decorator)
    const startTime = createSessionDto.startTime;

    // Validate date is in the future (UTC comparison - mathematically identical to zoned comparison)
    const now = TimezoneService.getUtcNow();
    if (TimezoneService.isBefore(startTime, now)) {
      throw new BusinessLogicException(
        't.messages.sessionDateMustBeInFuture',
        {} as any,
      );
    }

    // Calculate endTime from startTime + duration using date-fns
    const endTime = addMinutes(startTime, createSessionDto.duration);

    // Validate teacher conflict
    const teacherConflict =
      await this.sessionValidationService.validateTeacherConflict(
        teacherUserProfileId,
        startTime,
        endTime,
      );

    if (teacherConflict) {
      throw new BusinessLogicException(
        't.messages.scheduleConflict.description',
        {
          resource: 't.resources.session',
        },
      );
    }

    // Validate group conflict (overlapping sessions in same group)
    const groupConflict =
      await this.sessionValidationService.validateGroupConflict(
        groupId,
        startTime,
        endTime,
      );

    if (groupConflict) {
      throw new BusinessLogicException(
        't.messages.scheduleConflict.description',
        {
          resource: 't.resources.session',
        },
      );
    }

    // Extract centerId, branchId, and classId from validated group entity for snapshot
    const session = await this.sessionsRepository.create({
      groupId,
      centerId: group.centerId,
      branchId: group.branchId,
      classId: group.classId,
      scheduleItemId: undefined, // Extra sessions don't have scheduleItemId
      title: createSessionDto.title,
      startTime,
      endTime,
      status: SessionStatus.SCHEDULED,
      isExtraSession: true,
    });

    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.CREATED,
      new SessionCreatedEvent(session, actor, actor.centerId!),
    );

    return session;
  }

  /**
   * Start a session (materialize virtual to real)
   * Materializes a virtual slot into a real database record for attendance tracking
   * Finds the scheduled session slot and validates 30-minute window
   *
   * @param groupId - Group ID
   * @param actor - Actor performing the action
   * @returns Created or existing session
   * @throws BusinessLogicException if too early to start (>30 minutes before scheduled time)
   */
  @Transactional()
  async startSession(groupId: string, actor: ActorUser): Promise<Session> {
    // 1. Get current time from backend (timezone-aware)
    const now = TimezoneService.getZonedNowFromContext();

    // 2. Fetch Group with class to extract denormalized fields and schedule items
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
      'class',
    ]);

    // 3. Access Validation
    // DTO validation (@BelongsToBranch decorator) already ensures group belongs to actor's branch
    // Validate actor has class staff access
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    // 4. Get schedule items for this group
    const scheduleItems = await this.scheduleItemsRepository.getMany(
      { groupId },
      actor,
    );

    if (scheduleItems.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        resource: 't.resources.session',
      } as any);
    }

    // 5. Find the scheduled session slot that matches current time
    // Calculate virtual sessions for today and next few days to find matching slot
    const today = startOfDay(now);
    const searchEndDate = addDays(today, 7); // Search up to 7 days ahead

    const groupMap = new Map<string, Group>();
    groupMap.set(group.id, group);

    const virtualSessions = this.calculateVirtualSessions(
      scheduleItems,
      groupMap,
      today,
      searchEndDate,
    );

    // Find the scheduled session slot that we're trying to start
    // Look for a session slot where current time is within 30 minutes before or anytime after
    let scheduledStartTime: Date | null = null;
    let matchingScheduleItemId: string | undefined = undefined;

    for (const virtualSession of virtualSessions) {
      const slotStartTime = virtualSession.startTime;
      const thirtyMinutesBefore = subMinutes(slotStartTime, 30);

      // Current time must be >= (scheduled time - 30 minutes)
      // This means we can start 30 minutes early or anytime after scheduled time
      if (now >= thirtyMinutesBefore) {
        // Use the scheduled time, not current time
        scheduledStartTime = slotStartTime;
        matchingScheduleItemId = virtualSession.scheduleItemId;
        break; // Use the first matching slot
      }
    }

    if (!scheduledStartTime) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        resource: 't.resources.session',
      } as any);
    }

    // 6. Normalize scheduled start time (strip milliseconds for exact matching)
    const normalizedTimestamp =
      Math.floor(scheduledStartTime.getTime() / 1000) * 1000;
    const normalizedStartTime =
      TimezoneService.fromTimestamp(normalizedTimestamp);

    // 7. Duplicate Check: Query repository for existing session at this scheduled time
    const existingSession =
      await this.sessionsRepository.findByGroupIdAndStartTime(
        groupId,
        normalizedStartTime,
      );

    if (existingSession) {
      // Idempotent operation - return existing session
      return existingSession;
    }

    // 8. Calculate endTime from scheduled startTime + class duration
    const endTime = addMinutes(normalizedStartTime, group.class.duration);

    // 9. Create Session with denormalized fields
    const session = await this.sessionsRepository.create({
      groupId,
      centerId: group.centerId,
      branchId: group.branchId,
      classId: group.classId,
      scheduleItemId: matchingScheduleItemId,
      startTime: normalizedStartTime,
      endTime,
      status: SessionStatus.CONDUCTING,
      isExtraSession: matchingScheduleItemId === undefined,
    });

    // 10. Emit Event
    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.CREATED,
      new SessionCreatedEvent(session, actor, actor.centerId!),
    );

    // 11. Return created session
    return session;
  }

  /**
   * Cancel a session (create tombstone or update existing)
   * Creates a tombstone record for virtual slots or updates existing real sessions to CANCELLED
   *
   * @param groupId - Group ID
   * @param scheduledStartTime - Scheduled start time (ISO 8601 string, will be parsed and normalized)
   * @param actor - Actor performing the action
   * @returns Updated or created cancelled session
   */
  @Transactional()
  async cancelSession(
    groupId: string,
    scheduledStartTime: Date,
    actor: ActorUser,
  ): Promise<Session> {
    // scheduledStartTime is already a UTC Date object (converted by @IsIsoDateTime decorator)
    // Normalize milliseconds for exact matching (strip milliseconds)
    const normalizedStartTime = TimezoneService.fromTimestamp(
      Math.floor(scheduledStartTime.getTime() / 1000) * 1000,
    );

    // 1. Fetch Group with class to extract denormalized fields
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
      'class',
    ]);

    // 2. Access Validation
    // DTO validation (@BelongsToBranch decorator) already ensures group belongs to actor's branch
    // Validate actor has class staff access
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    // 3. Check Existing Session
    const existingSession =
      await this.sessionsRepository.findByGroupIdAndStartTime(
        groupId,
        normalizedStartTime,
      );

    let session: Session;

    if (existingSession) {
      // 4a. Update existing session
      await this.sessionsRepository.update(existingSession.id, {
        status: SessionStatus.CANCELED,
      });
      // Fetch updated session
      session = await this.sessionsRepository.findOneOrThrow(
        existingSession.id,
      );
    } else {
      // 4b. Create tombstone record (virtual slot)
      const endTime = addMinutes(normalizedStartTime, group.class.duration);

      // Try to find matching scheduleItemId (optional enhancement)
      // Note: Schedule item matching is complex and would require calculating all occurrences
      // For now, we'll leave it undefined - can be enhanced later
      const scheduleItemId: string | undefined = undefined;

      session = await this.sessionsRepository.create({
        groupId,
        centerId: group.centerId,
        branchId: group.branchId,
        classId: group.classId,
        scheduleItemId,
        startTime: normalizedStartTime,
        endTime,
        status: SessionStatus.CANCELED,
        isExtraSession: scheduleItemId === undefined,
      });
    }

    // 5. Emit Event
    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.CANCELED,
      new SessionCanceledEvent(session, actor, actor.centerId!),
    );

    // 6. Return updated or created session
    return session;
  }

  /**
   * Update a session
   * Can update title, date, startTime, and duration
   * Only SCHEDULED sessions can have their times changed
   * @param sessionId - Session ID
   * @param updateSessionDto - Update data (date, startTime, duration are required)
   * @param actor - Actor performing the action
   */
  @Transactional()
  async updateSession(
    sessionId: string,
    updateSessionDto: UpdateSessionDto,
    actor: ActorUser,
  ): Promise<Session> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    // Only SCHEDULED sessions can have their times changed
    if (session.status !== SessionStatus.SCHEDULED) {
      const currentStatus = session.status;
      throw new BusinessLogicException('t.messages.cannotUpdateSession', {
        status: currentStatus,
      });
    }

    // Fetch group with class to get teacherUserProfileId
    const group = await this.groupsRepository.findByIdOrThrow(session.groupId, [
      'class',
    ]);

    // Validate branch access
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: group.branchId,
    });

    // Validate class staff access (for STAFF users)
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    const teacherUserProfileId = group.class.teacherUserProfileId;

    // startTime is already a UTC Date object (converted by @IsIsoDateTime decorator)
    const newStartTime = updateSessionDto.startTime;

    // Validate date is in the future (UTC comparison - mathematically identical to zoned comparison)
    const now = TimezoneService.getUtcNow();
    if (TimezoneService.isBefore(newStartTime, now)) {
      throw new BusinessLogicException('t.messages.sessionDateMustBeInFuture');
    }

    // Calculate endTime from startTime + duration using date-fns
    const newEndTime = addMinutes(newStartTime, updateSessionDto.duration);

    // Validate teacher conflict if time changed
    const timeChanged =
      newStartTime.getTime() !== session.startTime.getTime() ||
      newEndTime.getTime() !== session.endTime.getTime();

    if (timeChanged) {
      if (teacherUserProfileId) {
        const teacherConflict =
          await this.sessionValidationService.validateTeacherConflict(
            teacherUserProfileId,
            newStartTime,
            newEndTime,
            sessionId, // Exclude current session
          );

        if (teacherConflict) {
          throw new BusinessLogicException(
            't.messages.scheduleConflict.description',
            { resource: 't.resources.session' },
          );
        }
      }

      // Validate group conflict (overlapping sessions in same group)
      const groupConflict =
        await this.sessionValidationService.validateGroupConflict(
          session.groupId,
          newStartTime,
          newEndTime,
          sessionId, // Exclude current session
        );

      if (groupConflict) {
        throw new BusinessLogicException(
          't.messages.scheduleConflict.description',
          { resource: 't.resources.session' },
        );
      }
    }

    const updateData: {
      title?: string;
      startTime: Date;
      endTime: Date;
    } = {
      startTime: newStartTime,
      endTime: newEndTime,
    };

    if (updateSessionDto.title !== undefined) {
      updateData.title = updateSessionDto.title;
    }

    const updatedSession = await this.sessionsRepository.updateThrow(
      sessionId,
      updateData,
    );

    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.UPDATED,
      new SessionUpdatedEvent(updatedSession, actor, actor.centerId!),
    );

    return updatedSession;
  }

  /**
   * Finish a session (CONDUCTING → FINISHED)
   * Only allows transition from CONDUCTING to FINISHED status
   * @param sessionId - Session ID
   * @param actor - Actor performing the action
   * @returns Updated session with FINISHED status
   */
  @Transactional()
  async finishSession(sessionId: string, actor: ActorUser): Promise<Session> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    // Validate current status is CONDUCTING
    if (session.status !== SessionStatus.CONDUCTING) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        resource: 't.resources.session',
      } as any);
    }

    // Fetch group with class for access validation
    const group = await this.groupsRepository.findByIdOrThrow(session.groupId, [
      'class',
    ]);

    // Validate branch access
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: group.branchId,
    });

    // Validate class staff access (for STAFF users)
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    // Update status to FINISHED
    const updatedSession = await this.sessionsRepository.updateThrow(
      sessionId,
      { status: SessionStatus.FINISHED },
    );

    // Emit UPDATED event
    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.UPDATED,
      new SessionUpdatedEvent(updatedSession, actor, actor.centerId!),
    );

    return updatedSession;
  }

  /**
   * Schedule a session (CANCELED → SCHEDULED)
   * Only allows transition from CANCELED to SCHEDULED status
   * Used to reschedule previously canceled sessions
   * @param sessionId - Session ID
   * @param actor - Actor performing the action
   * @returns Updated session with SCHEDULED status
   */
  @Transactional()
  async scheduleSession(sessionId: string, actor: ActorUser): Promise<Session> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    // Validate current status is CANCELED
    if (session.status !== SessionStatus.CANCELED) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        resource: 't.resources.session',
      } as any);
    }

    // Fetch group with class for access validation
    const group = await this.groupsRepository.findByIdOrThrow(session.groupId, [
      'class',
    ]);

    // Validate branch access
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: group.branchId,
    });

    // Validate class staff access (for STAFF users)
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    // Update status to SCHEDULED
    const updatedSession = await this.sessionsRepository.updateThrow(
      sessionId,
      { status: SessionStatus.SCHEDULED },
    );

    // Emit UPDATED event
    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.UPDATED,
      new SessionUpdatedEvent(updatedSession, actor, actor.centerId!),
    );

    return updatedSession;
  }

  /**
   * Delete a session
   * Only SCHEDULED extra sessions (isExtraSession: true) can be deleted
   * Scheduled sessions (isExtraSession: false) must be canceled instead
   * TODO: Check for payments/attendance before deletion
   * @param sessionId - Session ID
   * @param actor - Actor performing the action
   */
  @Transactional()
  async deleteSession(sessionId: string, actor: ActorUser): Promise<void> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    // Fetch group with class for access validation
    const group = await this.groupsRepository.findByIdOrThrow(session.groupId, [
      'class',
    ]);

    // Validate branch access
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: group.branchId,
    });

    // Validate class staff access (for STAFF users)
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    await this.sessionValidationService.validateSessionDeletion(sessionId);

    await this.sessionsRepository.remove(sessionId);

    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.DELETED,
      new SessionDeletedEvent(sessionId, actor, actor.centerId!),
    );
  }

  /**
   * Get sessions for calendar view
   * Returns sessions in calendar-friendly format with all necessary metadata
   * Includes both real sessions and virtual sessions calculated from schedule items
   *
   * @param dto - Calendar sessions DTO with filters and date range
   * @param actor - Actor performing the action
   * @returns Calendar sessions response with items, dateRange, and total
   */
  async getCalendarSessions(
    dto: CalendarSessionsDto,
    actor: ActorUser,
  ): Promise<CalendarSessionsResponseDto> {
    // Convert date strings to UTC date range
    // dto.dateFrom and dto.dateTo are already UTC Date objects (converted by @IsIsoDateTime decorator)
    // For calendar queries, extract date part and create range in center timezone
    const timezone = TimezoneService.getTimezoneFromContext();
    const { start: startDate, end: endDate } =
      TimezoneService.dateRangeFromDates(dto.dateFrom, dto.dateTo, timezone);

    // Get real sessions with relations loaded
    const realSessions = await this.sessionsRepository.getCalendarSessions(
      dto,
      actor,
    );

    // Get schedule items with group relations
    const scheduleItems = await this.scheduleItemsRepository.getMany(
      {
        centerId: actor.centerId!,
        groupId: dto.groupId,
        classId: dto.classId,
      },
      actor,
    );

    // Load all groups with class and teacher relations for efficient lookups
    const groupIds = new Set<string>();
    realSessions.forEach((s) => groupIds.add(s.groupId));
    scheduleItems.forEach((si) => groupIds.add(si.groupId));

    const groups = await Promise.all(
      Array.from(groupIds).map((groupId) =>
        this.groupsRepository.findByIdOrThrow(groupId, [
          'class',
          'class.teacher',
          'class.teacher.user',
        ]),
      ),
    );

    // Build group map for O(1) lookups
    const groupMap = new Map<string, Group>();
    groups.forEach((group) => groupMap.set(group.id, group));

    // Calculate virtual sessions from schedule items
    const virtualSessions = this.calculateVirtualSessions(
      scheduleItems,
      groupMap,
      startDate,
      endDate,
    );

    // Merge real and virtual sessions (real sessions override virtual ones)
    const mergedSessions = this.mergeSessions(realSessions, virtualSessions);

    // Apply status filter if provided
    let filteredSessions = mergedSessions;
    if (dto.status !== undefined && dto.status !== null) {
      filteredSessions = mergedSessions.filter((s) => s.status === dto.status);
    }

    // Sort by startTime
    filteredSessions.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );

    // Convert to calendar format
    const items: CalendarSessionItem[] = filteredSessions.map((session) => {
      const group = groupMap.get(session.groupId);
      if (!group) {
        throw new Error(`Group ${session.groupId} not found`);
      }
      if (!group.class) {
        throw new Error(`Class not loaded for group ${session.groupId}`);
      }

      // Generate ID for virtual sessions (deterministic based on groupId + startTime)
      const sessionId = session.id;

      return {
        id: sessionId,
        title: session.title || 'Session',
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
        status: session.status,
        groupId: session.groupId,
        isExtraSession: session.isExtraSession,
        group: {
          id: group.id,
          name: group.name || '',
          class: {
            id: group.class.id,
            name: group.class.name || '',
            teacher: {
              user: {
                name: group.class.teacher?.user?.name || '',
              },
            },
          },
        },
      };
    });

    return {
      items,
      meta: {
        totalItems: items.length,
        itemsPerPage: 1000,
        totalPages: 1,
        currentPage: 1,
      },
    };
  }

  /**
   * Calculate virtual sessions from schedule items
   * @param scheduleItems - Schedule items to calculate sessions from
   * @param groupMap - Map of groups with class relations loaded
   * @param startDate - Start date (inclusive, UTC)
   * @param endDate - End date (exclusive, UTC)
   * @returns Array of virtual sessions
   */
  private calculateVirtualSessions(
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
      const effectiveStartDate = TimezoneService.fromTimestamp(
        Math.max(startDate.getTime(), classEntity.startDate.getTime()),
      );

      // Cap endDate to class endDate if it exists
      let effectiveEndDate = endDate;
      if (classEntity.endDate) {
        effectiveEndDate = TimezoneService.fromTimestamp(
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
        // Calculate startTime and endTime using timezone-aware conversion
        const dateStr = TimezoneService.formatZoned(date, 'yyyy-MM-dd');
        const sessionStartTime = TimezoneService.toUtc(
          dateStr,
          scheduleItem.startTime,
        );

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
    let currentDate = startOfDay(startDate);

    // endDate is exclusive, so we continue while currentDate < endDate
    while (currentDate.getTime() < endDate.getTime()) {
      // Use timezone-aware day of week to match schedule items (which are in center timezone)
      if (TimezoneService.getDayOfWeek(currentDate) === targetDay) {
        dates.push(currentDate);
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
  private mergeSessions(
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

  /**
   * Get a single session
   * @param sessionId - Session ID
   * @param actor - Actor performing the action
   */
  async getSession(sessionId: string, actor: ActorUser): Promise<Session> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    // Fetch group with class to get branchId and classId
    const group = await this.groupsRepository.findByIdOrThrow(session.groupId, [
      'class',
    ]);

    // Validate center access (implicit via centerId check)
    if (group.centerId !== actor.centerId) {
      throw new BusinessLogicException('t.messages.withIdNotFound', {
        resource: 't.resources.session',
        identifier: 't.resources.identifier',
        value: sessionId,
      });
    }

    // Validate branch access
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId,
      branchId: group.branchId,
    });

    // Validate class staff access (for STAFF users)
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: group.classId,
    });

    return session;
  }
}
