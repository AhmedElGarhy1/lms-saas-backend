import { Injectable } from '@nestjs/common';
import { SessionsRepository } from '../repositories/sessions.repository';
import { SessionValidationService } from './session-validation.service';
import { SessionGenerationService } from './session-generation.service';
import { BaseService } from '@/shared/common/services/base.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import {
  SessionCreatedEvent,
  SessionUpdatedEvent,
  SessionDeletedEvent,
  SessionCanceledEvent,
  SessionsRegeneratedEvent,
  SessionsBulkDeletedEvent,
  SessionConflictDetectedEvent,
} from '../events/session.events';
import { Session } from '../entities/session.entity';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { PaginateSessionsDto } from '../dto/paginate-sessions.dto';
import { CalendarSessionsDto } from '../dto/calendar-sessions.dto';
import {
  CalendarSessionsResponseDto,
  CalendarSessionItem,
} from '../dto/calendar-sessions-response.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { SessionStatus } from '../enums/session-status.enum';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { Transactional } from '@nestjs-cls/transactional';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { ScheduleItemsRepository } from '@/modules/classes/repositories/schedule-items.repository';
import { ScheduleItem } from '@/modules/classes/entities/schedule-item.entity';
import { DayOfWeek } from '@/modules/classes/enums/day-of-week.enum';
import { SessionsBulkCreatedEvent } from '../events/session.events';
import { TimezoneService } from '@/shared/common/services/timezone.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassAccessService } from '@/modules/classes/services/class-access.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import {
  addMinutes,
  addMonths,
  addDays,
  min,
  startOfDay,
  isAfter,
  format,
} from 'date-fns';
import { TZDate } from '@date-fns/tz';

@Injectable()
export class SessionsService extends BaseService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly sessionValidationService: SessionValidationService,
    private readonly sessionGenerationService: SessionGenerationService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly groupsRepository: GroupsRepository,
    private readonly scheduleItemsRepository: ScheduleItemsRepository,
    private readonly branchAccessService: BranchAccessService,
    private readonly classAccessService: ClassAccessService,
    private readonly accessControlHelperService: AccessControlHelperService,
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
    // Fetch group with class to get teacherUserProfileId using repository
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
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

    // Use date string directly (already YYYY-MM-DD format)
    const dateStr = createSessionDto.date;

    // Validate date is in the future using center timezone
    const centerNow = TimezoneService.getZonedNowFromContext();
    const requestedDate = TimezoneService.dateOnlyToUtc(dateStr);
    if (TimezoneService.isAfter(requestedDate, centerNow)) {
      throw new BusinessLogicException(
        't.messages.sessionDateMustBeInFuture',
        {} as any,
      );
    }

    // Create full datetime from date + time using timezone-aware conversion
    const startTime = TimezoneService.toUtc(
      dateStr,
      createSessionDto.startTime,
    );

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

    const session = await this.sessionsRepository.create({
      groupId,
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

    // Use date string directly (already YYYY-MM-DD format)
    const dateStr = updateSessionDto.date;

    // Validate date is in the future using center timezone
    const centerNow = TimezoneService.getZonedNowFromContext();
    const requestedDate = TimezoneService.dateOnlyToUtc(dateStr);
    if (TimezoneService.isAfter(requestedDate, centerNow)) {
      throw new BusinessLogicException('t.messages.sessionDateMustBeInFuture');
    }

    // Create full datetime from date + time using timezone-aware conversion
    const newStartTime = TimezoneService.toUtc(
      dateStr,
      updateSessionDto.startTime,
    );

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
   * Update session status
   * Handles status transitions and emits appropriate events
   * @param sessionId - Session ID
   * @param status - New status
   * @param actor - Actor performing the action
   */
  @Transactional()
  async updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    actor: ActorUser,
  ): Promise<Session> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);
    const previousStatus = session.status;

    // If status hasn't changed, return early
    if (status === previousStatus) {
      return session;
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

    // Validate cancellation: only SCHEDULED sessions can be canceled
    if (status === SessionStatus.CANCELED) {
      await this.sessionValidationService.validateSessionCancellation(
        sessionId,
      );
    }

    const updatedSession = await this.sessionsRepository.updateThrow(
      sessionId,
      { status },
    );

    // Emit appropriate event based on status change
    if (status === SessionStatus.CANCELED) {
      await this.typeSafeEventEmitter.emitAsync(
        SessionEvents.CANCELED,
        new SessionCanceledEvent(updatedSession, actor, actor.centerId!),
      );
    } else {
      // For other status changes, emit UPDATED event
      await this.typeSafeEventEmitter.emitAsync(
        SessionEvents.UPDATED,
        new SessionUpdatedEvent(updatedSession, actor, actor.centerId!),
      );
    }

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
   * Paginate sessions with filtering and search capabilities.
   *
   * @param paginateDto - Pagination and filter parameters
   * @param actor - The user performing the action
   * @returns Paginated list of sessions
   */
  async paginateSessions(
    paginateDto: PaginateSessionsDto,
    actor: ActorUser,
  ): Promise<Pagination<Session>> {
    return this.sessionsRepository.paginateSessions(paginateDto, actor);
  }

  /**
   * Get sessions for calendar view
   * Returns sessions in calendar-friendly format with all necessary metadata
   *
   * @param dto - Calendar sessions DTO with filters and date range
   * @param actor - Actor performing the action
   * @returns Calendar sessions response with items, dateRange, and total
   */
  async getCalendarSessions(
    dto: CalendarSessionsDto,
    actor: ActorUser,
  ): Promise<CalendarSessionsResponseDto> {
    // Get sessions and total count
    const sessions = await this.sessionsRepository.getCalendarSessions(
      dto,
      actor,
    );
    const total = await this.sessionsRepository.countCalendarSessions(
      dto,
      actor,
    );

    // Transform sessions to calendar format with nested relations
    const items: CalendarSessionItem[] = sessions.map((session) => {
      // Type assertion for loaded relations
      const sessionWithRelations = session as Session & {
        group?: {
          id?: string;
          name?: string;
          class?: {
            id?: string;
            name?: string;
            teacher?: {
              user?: {
                name?: string;
              };
            };
          };
        };
      };

      const group = sessionWithRelations.group;
      const classEntity = group?.class;
      const teacher = classEntity?.teacher;
      const teacherUser = teacher?.user;

      return {
        id: session.id,
        title: session.title || 'Session',
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
        status: session.status,
        groupId: session.groupId,
        isExtraSession: session.isExtraSession,
        group: {
          id: group?.id || session.groupId,
          name: group?.name || '',
          class: {
            id: classEntity?.id || '',
            name: classEntity?.name || '',
            teacher: {
              user: {
                name: teacherUser?.name || '',
              },
            },
          },
        },
      };
    });

    return {
      items,
      meta: {
        totalItems: total,
        itemsPerPage: 1000,
        totalPages: 1,
        currentPage: 1,
      },
    };
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

  /**
   * Update sessions endTime when class duration changes
   * Only updates future SCHEDULED sessions (isExtraSession: false)
   * Validates conflicts and skips sessions with conflicts
   * @param classId - Class ID
   * @param newDuration - New duration in minutes
   * @param actor - Actor performing the action
   * @returns Object with updated and conflicts counts
   */
  @Transactional()
  async updateSessionsEndTimeForDurationChange(
    classId: string,
    newDuration: number,
    actor: ActorUser,
  ): Promise<{ updated: number; conflicts: number }> {
    const groups = await this.groupsRepository.findByClassId(classId);

    let totalUpdated = 0;
    let totalConflicts = 0;

    for (const group of groups) {
      const groupId = group.id;

      // Get group with class to access teacherUserProfileId
      const groupWithClass = await this.groupsRepository.findByIdOrThrow(
        groupId,
        ['class'],
      );
      const teacherUserProfileId = groupWithClass.class.teacherUserProfileId;

      // Find all future SCHEDULED sessions for this group (excluding extra sessions)
      const futureSessions =
        await this.sessionsRepository.findFutureScheduledSessionsByGroup(
          groupId,
        );

      // Filter to only scheduled sessions (not extra)
      const scheduledSessions = futureSessions.filter((s) => !s.isExtraSession);

      const sessionsToUpdate: Session[] = [];
      const conflictSessions: Session[] = [];

      for (const session of scheduledSessions) {
        // Calculate new endTime = startTime + newDuration (in minutes)
        const newEndTime = addMinutes(session.startTime, newDuration);

        // Validate teacher conflict
        const teacherConflict =
          await this.sessionValidationService.validateTeacherConflict(
            teacherUserProfileId,
            session.startTime,
            newEndTime,
            session.id, // Exclude current session
          );

        if (teacherConflict) {
          // Emit conflict detection event
          await this.typeSafeEventEmitter.emitAsync(
            SessionEvents.CONFLICT_DETECTED,
            new SessionConflictDetectedEvent(
              groupId,
              session.scheduleItemId || '',
              session.startTime,
              newEndTime,
              'TEACHER' as const,
              teacherConflict.sessionId,
              teacherConflict.startTime,
              teacherConflict.endTime,
              actor,
              String(actor.centerId),
            ),
          );
          conflictSessions.push(session);
          totalConflicts++;
          continue;
        }

        // Validate group conflict
        const groupConflict =
          await this.sessionValidationService.validateGroupConflict(
            groupId,
            session.startTime,
            newEndTime,
            session.id, // Exclude current session
          );

        if (groupConflict) {
          // Emit conflict detection event
          await this.typeSafeEventEmitter.emitAsync(
            SessionEvents.CONFLICT_DETECTED,
            new SessionConflictDetectedEvent(
              groupId,
              session.scheduleItemId || '',
              session.startTime,
              newEndTime,
              'GROUP' as const,
              groupConflict.sessionId,
              groupConflict.startTime,
              groupConflict.endTime,
              actor,
              String(actor.centerId),
            ),
          );
          conflictSessions.push(session);
          totalConflicts++;
          continue;
        }

        // No conflict, add to update list
        sessionsToUpdate.push(session);
      }

      // Update sessions that don't have conflicts
      for (const session of sessionsToUpdate) {
        const newEndTime = addMinutes(session.startTime, newDuration);

        await this.sessionsRepository.updateThrow(session.id, {
          endTime: newEndTime,
        });

        // Emit updated event for each session
        const updatedSession = await this.sessionsRepository.findOneOrThrow(
          session.id,
        );
        await this.typeSafeEventEmitter.emitAsync(
          SessionEvents.UPDATED,
          new SessionUpdatedEvent(updatedSession, actor, actor.centerId!),
        );

        totalUpdated++;
      }
    }

    return { updated: totalUpdated, conflicts: totalConflicts };
  }

  /**
   * Regenerate sessions for a schedule item
   * Only affects future SCHEDULED sessions linked to this scheduleItem
   * Preserves isExtraSession: true sessions
   * TODO: Check for payments/attendance before deletion
   * @param scheduleItemId - Schedule Item ID
   * @param actor - Actor performing the action
   */
  @Transactional()
  async regenerateSessionsForScheduleItem(
    scheduleItemId: string,
    actor: ActorUser,
  ): Promise<void> {
    // Fetch scheduleItem with group to get groupId using repository
    const scheduleItem = await this.scheduleItemsRepository.findByIdOrThrow(
      scheduleItemId,
      ['group'],
    );

    // Find future SCHEDULED sessions for this scheduleItem
    const sessionsToDelete =
      await this.sessionsRepository.findFutureScheduledSessionsByScheduleItem(
        scheduleItemId,
      );

    // Filter out sessions that are:
    // - CONDUCTING, FINISHED, or CANCELED (already handled by repository)
    // - isExtraSession: true (preserve manual sessions)
    // TODO: Filter out sessions linked to payments/attendance
    const sessionsToDeleteFiltered = sessionsToDelete.filter(
      (s) => !s.isExtraSession,
    );

    const deletedCount = sessionsToDeleteFiltered.length;
    const deletedSessionIds: string[] = [];

    // Delete filtered sessions
    for (const session of sessionsToDeleteFiltered) {
      await this.sessionsRepository.remove(session.id);
      deletedSessionIds.push(session.id);
    }

    // Emit single bulk event for all deleted sessions
    if (deletedSessionIds.length > 0) {
      await this.typeSafeEventEmitter.emitAsync(
        SessionEvents.BULK_DELETED,
        new SessionsBulkDeletedEvent(deletedSessionIds, actor, actor.centerId!),
      );
    }

    // Regenerate sessions from updated scheduleItem
    // Calculate date range (2 months from now) using center timezone
    const now = TimezoneService.getZonedNowFromContext();
    const endDate = addMonths(now, 2);

    const createdSessions =
      await this.sessionGenerationService.generateSessionsForGroup(
        scheduleItem.groupId,
        now,
        endDate,
        actor,
      );

    const createdCount = createdSessions.length;

    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.REGENERATED,
      new SessionsRegeneratedEvent(
        scheduleItemId,
        scheduleItem.groupId,
        deletedCount,
        createdCount,
        actor,
        actor.centerId!,
      ),
    );
  }

  /**
   * Delete future sessions for removed schedule items
   * Used before deleting schedule items to prevent FK constraint violations
   * @param scheduleItemIds - Array of schedule item IDs to delete sessions for
   * @param actor - Actor performing the action
   * @returns Number of sessions deleted
   */
  @Transactional()
  async deleteSessionsForRemovedScheduleItems(
    scheduleItemIds: string[],
    actor: ActorUser,
  ): Promise<number> {
    let deletedCount = 0;
    const allDeletedSessionIds: string[] = [];

    for (const scheduleItemId of scheduleItemIds) {
      const futureSessions =
        await this.sessionsRepository.findFutureScheduledSessionsByScheduleItem(
          scheduleItemId,
        );

      // Filter to only scheduled sessions (not extra)
      const sessionsToDelete = futureSessions.filter((s) => !s.isExtraSession);

      for (const session of sessionsToDelete) {
        await this.sessionsRepository.remove(session.id);
        allDeletedSessionIds.push(session.id);
        deletedCount++;
      }
    }

    // Emit single bulk event for all deleted sessions
    if (allDeletedSessionIds.length > 0) {
      await this.typeSafeEventEmitter.emitAsync(
        SessionEvents.BULK_DELETED,
        new SessionsBulkDeletedEvent(
          allDeletedSessionIds,
          actor,
          actor.centerId!,
        ),
      );
    }

    return deletedCount;
  }

  /**
   * Update sessions intelligently when schedule items change
   * Compares old vs new schedule items and updates sessions accordingly:
   * - Added items: Generate new sessions
   * - Removed items: Delete future sessions
   * - Modified items: Update existing sessions (move to new day/time)
   * - Unchanged items: Leave as-is
   * @param groupId - Group ID
   * @param oldScheduleItems - Old schedule items
   * @param newScheduleItems - New schedule items
   * @param actor - Actor performing the action
   * @returns Object with counts of added, removed, updated, and conflicts
   */
  @Transactional()
  async updateSessionsForScheduleItemsChange(
    groupId: string,
    oldScheduleItems: ScheduleItem[],
    newScheduleItems: ScheduleItem[],
    actor: ActorUser,
  ): Promise<{
    added: number;
    removed: number;
    updated: number;
    conflicts: number;
  }> {
    // Get group with class to access teacher and duration
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
      'class',
    ]);
    const teacherUserProfileId = group.class.teacherUserProfileId;
    const duration = group.class.duration; // in minutes

    // Helper to get schedule item key
    const getScheduleItemKey = (item: {
      day: DayOfWeek;
      startTime: string;
    }): string => `${item.day}-${item.startTime}`;

    // Create maps for comparison
    const oldMap = new Map(
      oldScheduleItems.map((item) => [getScheduleItemKey(item), item]),
    );
    const newMap = new Map(
      newScheduleItems.map((item) => [getScheduleItemKey(item), item]),
    );

    let addedCount = 0;
    let removedCount = 0;
    let updatedCount = 0;
    let conflictsCount = 0;

    // Process removed items (exist in old but not in new)
    for (const [key, oldItem] of oldMap) {
      if (!newMap.has(key)) {
        // Schedule item was removed - delete future sessions for this item
        const sessionsToDelete =
          await this.sessionsRepository.findFutureScheduledSessionsByScheduleItem(
            oldItem.id,
          );

        // Filter to only scheduled sessions (not extra)
        const sessionsToDeleteFiltered = sessionsToDelete.filter(
          (s) => !s.isExtraSession,
        );

        const deletedSessionIds: string[] = [];
        for (const session of sessionsToDeleteFiltered) {
          await this.sessionsRepository.remove(session.id);
          deletedSessionIds.push(session.id);
        }

        if (deletedSessionIds.length > 0) {
          await this.typeSafeEventEmitter.emitAsync(
            SessionEvents.BULK_DELETED,
            new SessionsBulkDeletedEvent(
              deletedSessionIds,
              actor,
              actor.centerId!,
            ),
          );
          removedCount += deletedSessionIds.length;
        }
      }
    }

    // Process added items (exist in new but not in old)
    for (const [key, newScheduleItem] of newMap) {
      if (!oldMap.has(key)) {
        // Schedule item was added - generate new sessions for this specific item
        const now = TimezoneService.getZonedNowFromContext();
        const endDate = addMonths(now, 2);

        // Cap endDate to class endDate if it exists
        let effectiveEndDate = endDate;
        if (group.class.endDate) {
          effectiveEndDate = min([endDate, group.class.endDate]);
        }

        if (!TimezoneService.isBefore(effectiveEndDate, now)) {
          // Generate sessions for this specific schedule item
          const dates = this.getDatesForDayOfWeek(
            now,
            effectiveEndDate,
            newScheduleItem.day,
          );

          const sessionsToCreate: Partial<Session>[] = [];

          for (const date of dates) {
            // Calculate startTime and endTime using timezone-aware conversion
            // Get the date string in center timezone (not UTC) to correctly handle
            // cases where late-night times cross midnight in UTC
            const timezone = TimezoneService.getTimezoneFromContext();
            const zonedDate = new TZDate(date, timezone);
            const dateStr = format(zonedDate, 'yyyy-MM-dd');
            const sessionStartTime = TimezoneService.toUtc(
              dateStr,
              newScheduleItem.startTime,
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
              await this.typeSafeEventEmitter.emitAsync(
                SessionEvents.CONFLICT_DETECTED,
                new SessionConflictDetectedEvent(
                  groupId,
                  newScheduleItem.id,
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
              conflictsCount++;
              continue;
            }

            // Check for duplicate (same groupId + startTime)
            const existingSessions =
              await this.sessionsRepository.findByGroupId(groupId, {
                startTimeFrom: sessionStartTime,
                startTimeTo: sessionStartTime,
              });

            if (existingSessions.length > 0) {
              // Skip if duplicate exists
              continue;
            }

            sessionsToCreate.push({
              groupId,
              scheduleItemId: newScheduleItem.id,
              startTime: sessionStartTime,
              endTime: sessionEndTime,
              status: SessionStatus.SCHEDULED,
              isExtraSession: false,
            });
          }

          if (sessionsToCreate.length > 0) {
            const createdSessions =
              await this.sessionsRepository.bulkInsert(sessionsToCreate);

            if (createdSessions.length > 0) {
              await this.typeSafeEventEmitter.emitAsync(
                SessionEvents.BULK_CREATED,
                new SessionsBulkCreatedEvent(
                  createdSessions,
                  actor,
                  actor.centerId!,
                ),
              );
            }

            addedCount += createdSessions.length;
          }
        }
      }
    }

    // Process modified items (exist in both but day or time changed)
    for (const [key, oldItem] of oldMap) {
      const newItem = newMap.get(key);
      if (
        newItem &&
        (oldItem.day !== newItem.day || oldItem.startTime !== newItem.startTime)
      ) {
        // Item was modified - update existing sessions
        const futureSessions =
          await this.sessionsRepository.findFutureScheduledSessionsByScheduleItem(
            oldItem.id,
          );

        // Filter to only scheduled sessions (not extra)
        const scheduledSessions = futureSessions.filter(
          (s) => !s.isExtraSession,
        );

        // Map DayOfWeek enum to JavaScript day index
        const dayMap: Record<DayOfWeek, number> = {
          [DayOfWeek.SUN]: 0,
          [DayOfWeek.MON]: 1,
          [DayOfWeek.TUE]: 2,
          [DayOfWeek.WED]: 3,
          [DayOfWeek.THU]: 4,
          [DayOfWeek.FRI]: 5,
          [DayOfWeek.SAT]: 6,
        };

        const oldDayIndex = dayMap[oldItem.day];
        const newDayIndex = dayMap[newItem.day];

        for (const session of scheduledSessions) {
          // Calculate new session times based on new schedule item
          const sessionDate = session.startTime;

          // Calculate new date - only move if day changed
          // Use timezone-aware day of week to match schedule items (which are in center timezone)
          const sessionDayOfWeek = TimezoneService.getDayOfWeek(sessionDate);
          let newSessionDate: Date;

          if (oldItem.day !== newItem.day) {
            // Day changed - move session to new day
            // Calculate days difference to move from old day to new day
            // Handle wrap-around (e.g., if old is Friday (5) and new is Monday (1))
            let daysDiff = newDayIndex - oldDayIndex;
            if (daysDiff < 0) {
              daysDiff += 7;
            }

            // Calculate offset from session's current day to old day
            const currentOffset = (sessionDayOfWeek - oldDayIndex + 7) % 7;
            // Move to new day: subtract offset to get to old day, then add daysDiff
            newSessionDate = addDays(sessionDate, -currentOffset + daysDiff);
          } else {
            // If only time changed, keep the same date
            newSessionDate = sessionDate;
          }

          // Calculate new startTime with new time using timezone-aware conversion
          // Get the date string in center timezone (not UTC) to correctly handle
          // cases where late-night times cross midnight in UTC
          const timezone = TimezoneService.getTimezoneFromContext();
          const zonedDate = new TZDate(newSessionDate, timezone);
          const dateStr = format(zonedDate, 'yyyy-MM-dd');
          const newStartTime = TimezoneService.toUtc(
            dateStr,
            newItem.startTime,
          );

          // Calculate new endTime
          const newEndTime = addMinutes(newStartTime, duration);

          // Validate teacher conflict
          const teacherConflict =
            await this.sessionValidationService.validateTeacherConflict(
              teacherUserProfileId,
              newStartTime,
              newEndTime,
              session.id,
            );

          if (teacherConflict) {
            await this.typeSafeEventEmitter.emitAsync(
              SessionEvents.CONFLICT_DETECTED,
              new SessionConflictDetectedEvent(
                groupId,
                newItem.id,
                newStartTime,
                newEndTime,
                'TEACHER' as const,
                teacherConflict.sessionId,
                teacherConflict.startTime,
                teacherConflict.endTime,
                actor,
                String(actor.centerId),
              ),
            );
            conflictsCount++;
            continue;
          }

          // Validate group conflict
          const groupConflict =
            await this.sessionValidationService.validateGroupConflict(
              groupId,
              newStartTime,
              newEndTime,
              session.id,
            );

          if (groupConflict) {
            await this.typeSafeEventEmitter.emitAsync(
              SessionEvents.CONFLICT_DETECTED,
              new SessionConflictDetectedEvent(
                groupId,
                newItem.id,
                newStartTime,
                newEndTime,
                'GROUP' as const,
                groupConflict.sessionId,
                groupConflict.startTime,
                groupConflict.endTime,
                actor,
                String(actor.centerId),
              ),
            );
            conflictsCount++;
            continue;
          }

          // No conflict, update the session
          const updatedSession = await this.sessionsRepository.updateThrow(
            session.id,
            {
              scheduleItemId: newItem.id,
              startTime: newStartTime,
              endTime: newEndTime,
            },
          );

          await this.typeSafeEventEmitter.emitAsync(
            SessionEvents.UPDATED,
            new SessionUpdatedEvent(updatedSession, actor, actor.centerId!),
          );

          updatedCount++;
        }
      }
    }

    return {
      added: addedCount,
      removed: removedCount,
      updated: updatedCount,
      conflicts: conflictsCount,
    };
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
    let currentDate = startOfDay(startDate);

    while (!isAfter(currentDate, endDate)) {
      // Use timezone-aware day of week to match schedule items (which are in center timezone)
      if (TimezoneService.getDayOfWeek(currentDate) === targetDay) {
        dates.push(currentDate);
      }
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  }
}
