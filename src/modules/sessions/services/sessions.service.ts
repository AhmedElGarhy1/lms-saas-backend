import { Injectable, Logger } from '@nestjs/common';
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
  SessionFinishedEvent,
} from '../events/session.events';
import { Session } from '../entities/session.entity';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { CalendarSessionsDto } from '../dto/calendar-sessions.dto';
import { PaginateSessionsDto } from '../dto/paginate-sessions.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { SessionStatus } from '../enums/session-status.enum';
import { SessionsErrors } from '../exceptions/sessions.errors';
import { Transactional } from '@nestjs-cls/transactional';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { SessionVirtualizationService } from './session-virtualization.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassAccessService } from '@/modules/classes/services/class-access.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { addMinutes, isBefore } from 'date-fns';
import { ScheduleItemsRepository } from '@/modules/classes/repositories/schedule-items.repository';
import { ClassStatus } from '@/modules/classes/enums/class-status.enum';
import {
  CalendarSessionsResponseDto,
  CalendarSessionItem,
} from '../dto/calendar-sessions-response.dto';
import { Group } from '@/modules/classes/entities/group.entity';
import {
  generateVirtualSessionId,
  parseVirtualSessionId,
  isVirtualSessionId,
} from '../utils/virtual-session-id.util';

@Injectable()
export class SessionsService extends BaseService {
  private readonly logger = new Logger(SessionsService.name);
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly sessionValidationService: SessionValidationService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly groupsRepository: GroupsRepository,
    private readonly sessionVirtualizationService: SessionVirtualizationService,
    private readonly branchAccessService: BranchAccessService,
    private readonly classAccessService: ClassAccessService,
    private readonly scheduleItemsRepository: ScheduleItemsRepository,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super();
  }

  /**
   * Paginate sessions for a center with filtering and search capabilities.
   *
   * @param paginateDto - Pagination and filter parameters
   * @param actor - The user performing the action
   * @returns Paginated list of sessions
   */
  async paginateSessions(
    paginateDto: PaginateSessionsDto,
    actor: ActorUser,
  ): Promise<Pagination<Session>> {
    // If no branchId specified, default to actor's branch to show only relevant sessions
    const dtoWithDefaults = {
      ...paginateDto,
      branchId: paginateDto.branchId || actor.branchId,
    };

    return this.sessionsRepository.paginateSessions(dtoWithDefaults, actor);
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

    // Sessions can only be created/materialized when the parent class is ACTIVE
    if (group.class.status !== ClassStatus.ACTIVE) {
      throw SessionsErrors.sessionClassNotActive();
    }

    // Check if user can bypass center internal access
    // If bypass is true, skip branch and class access validation
    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        actor.centerId,
      );

    if (!canBypassCenterInternalAccess) {
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
    }

    const teacherUserProfileId = group.class.teacherUserProfileId;

    // startTime is already a UTC Date object (converted by @IsIsoDateTime decorator)
    const startTime = createSessionDto.startTime;

    // Validate date is in the future (UTC comparison - mathematically identical to zoned comparison)
    const now = new Date();
    if (isBefore(startTime, now)) {
      throw SessionsErrors.sessionStartTimePast();
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
      throw SessionsErrors.sessionScheduleConflict();
    }

    // Validate group conflict (overlapping sessions in same group)
    const groupConflict =
      await this.sessionValidationService.validateGroupConflict(
        groupId,
        startTime,
        endTime,
      );

    if (groupConflict) {
      throw SessionsErrors.sessionScheduleConflict();
    }

    // Extract centerId, branchId, and classId from validated group entity for snapshot
    const session = await this.sessionsRepository.create({
      groupId,
      centerId: group.centerId,
      branchId: group.branchId,
      classId: group.classId,
      teacherUserProfileId,
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
   * Check-in a session (materialize virtual to real or update existing)
   * Handles both real sessions (UUID) and virtual sessions (virtual ID)
   *
   * For real sessions:
   * - If SCHEDULED → update to CHECKING_IN
   * - If CHECKING_IN → return as-is (idempotent)
   * - If CONDUCTING/FINISHED → return as-is
   * - If CANCELED → throw error
   *
   * For virtual sessions:
   * - Check if real session already exists (race condition protection)
   * - If exists → handle as real session
   * - If not → find matching schedule item and create CHECKING_IN session
   *
   * @param sessionId - Session ID (UUID or virtual ID)
   * @param actor - Actor performing the action
   * @returns Created or updated session
   * @throws SessionsErrors.sessionCheckInInvalidStatus() if session cannot be checked-in
   */
  @Transactional()
  async checkInSession(sessionId: string, actor: ActorUser): Promise<Session> {
    // 1. Resolve session from ID (handles security validation and race condition protection)
    const resolved = await this.resolveSessionFromId(sessionId, actor);

    // 2. Handle real session
    if (resolved.isReal && resolved.realSession) {
      const session = resolved.realSession;

      switch (session.status) {
        case SessionStatus.SCHEDULED: {
          await this.sessionsRepository.update(session.id, {
            status: SessionStatus.CHECKING_IN,
          });

          const updatedSession = await this.sessionsRepository.findOneOrThrow(
            session.id,
          );

          await this.typeSafeEventEmitter.emitAsync(
            SessionEvents.UPDATED,
            new SessionUpdatedEvent(updatedSession, actor, actor.centerId!),
          );

          return updatedSession;
        }

        case SessionStatus.CHECKING_IN:
        case SessionStatus.CONDUCTING:
        case SessionStatus.FINISHED:
          // Already checked-in/started/finished - return as-is (idempotent)
          return session;

        case SessionStatus.CANCELED:
          // Can't check-in a canceled session
          throw SessionsErrors.sessionCheckInInvalidStatus();

        default:
          throw SessionsErrors.sessionCheckInInvalidStatus();
      }
    }

    // 3. Handle virtual session (no real session exists)
    // Get current UTC time for schedule item matching
    const now = new Date();

    // Fetch group for denormalized fields
    const group = await this.groupsRepository.findByIdOrThrow(
      resolved.groupId,
      ['class'],
    );

    // Virtual check-in materializes a real session: require ACTIVE class
    if (group.class.status !== ClassStatus.ACTIVE) {
      throw SessionsErrors.sessionClassNotActive();
    }

    // Find matching schedule item using optimized database query
    const match =
      (await this.sessionsRepository.findMatchingScheduleItemForStartSession(
        resolved.groupId,
        now,
      )) as {
        scheduleItemId: string;
        calculatedStartTime: Date;
        calculatedEndTime: Date;
        existingSessionId?: string;
        existingSessionStatus?: SessionStatus;
      } | null;

    if (!match) {
      throw SessionsErrors.sessionScheduleItemNotFound();
    }

    // Normalize calculated start time (strip milliseconds for exact matching)
    const normalizedTimestamp =
      Math.floor(match.calculatedStartTime.getTime() / 1000) * 1000;
    const normalizedStartTime = new Date(normalizedTimestamp);

    // Double-check if session exists (race condition protection)
    // Even though we checked in resolveSessionFromId, another request might have created it
    if (match.existingSessionId) {
      const existingSession = await this.sessionsRepository.findOneOrThrow(
        match.existingSessionId,
      );
      return this.checkInSession(existingSession.id, actor);
    }

    // Create CHECKING_IN session (materialized from schedule)
    const session = await this.sessionsRepository.create({
      // Four Pillars snapshot (denormalized for access-control and fast filtering)
      groupId: group.id,
      centerId: group.centerId,
      branchId: group.branchId,
      classId: group.classId,
      teacherUserProfileId: group.class.teacherUserProfileId,
      scheduleItemId: match.scheduleItemId,
      startTime: normalizedStartTime,
      endTime: match.calculatedEndTime,
      status: SessionStatus.CHECKING_IN,
      isExtraSession: false, // Always false since we matched a schedule item
    });

    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.CREATED,
      new SessionCreatedEvent(session, actor, actor.centerId!),
    );

    return session;
  }

  /**
   * Start a session (CHECKING_IN → CONDUCTING)
   * Handles real sessions (UUID). Virtual sessions must be checked-in first.
   *
   * For real sessions:
   * - If CHECKING_IN → update to CONDUCTING
   * - If CONDUCTING/FINISHED → return as-is (idempotent)
   * - If CANCELED → throw error
   *
   * @param sessionId - Session ID (UUID or virtual ID)
   * @param actor - Actor performing the action
   * @returns Created or updated session
   * @throws SessionsErrors.sessionStartInvalidStatus() if session cannot be started
   */
  @Transactional()
  async startSession(sessionId: string, actor: ActorUser): Promise<Session> {
    // 1. Resolve session from ID (handles security validation and race condition protection)
    const resolved = await this.resolveSessionFromId(sessionId, actor);

    // 2. Strict flow: virtual sessions must be checked-in first (to materialize a real session record)
    if (!resolved.isReal || !resolved.realSession) {
      throw SessionsErrors.sessionNotCheckedIn();
    }

    // 3. Handle real session
    const session = resolved.realSession;

    switch (session.status) {
      case SessionStatus.CHECKING_IN: {
        // Update to CONDUCTING and capture actual start time
        const actualStartTime = new Date();
        await this.sessionsRepository.update(session.id, {
          status: SessionStatus.CONDUCTING,
          actualStartTime,
        });
        return await this.sessionsRepository.findOneOrThrow(session.id);
      }

      case SessionStatus.SCHEDULED:
        // Must check-in first
        throw SessionsErrors.sessionStartInvalidStatus();

      case SessionStatus.CONDUCTING:
      case SessionStatus.FINISHED:
        // Already started/finished - return as-is (idempotent)
        return session;

      case SessionStatus.CANCELED:
        // Can't start a canceled session
        throw SessionsErrors.sessionStartInvalidStatus();

      default:
        throw SessionsErrors.sessionStartInvalidStatus();
    }
  }

  /**
   * Cancel a session (create tombstone or update existing)
   * Handles both real sessions (UUID) and virtual sessions (virtual ID)
   *
   * For real sessions:
   * - Update status to CANCELED
   *
   * For virtual sessions:
   * - Check if real session already exists (race condition protection)
   * - If exists → update to CANCELED
   * - If not → find matching schedule item and create CANCELED tombstone
   *
   * @param sessionId - Session ID (UUID or virtual ID)
   * @param actor - Actor performing the action
   * @returns Updated or created cancelled session
   */
  @Transactional()
  async cancelSession(sessionId: string, actor: ActorUser): Promise<Session> {
    // 1. Resolve session from ID (handles security validation and race condition protection)
    const resolved = await this.resolveSessionFromId(sessionId, actor);

    // 2. Handle real session
    if (resolved.isReal && resolved.realSession) {
      const session = resolved.realSession;

      // Update existing session to CANCELED
      await this.sessionsRepository.update(session.id, {
        status: SessionStatus.CANCELED,
      });

      const updatedSession = await this.sessionsRepository.findOneOrThrow(
        session.id,
      );

      // Emit Event
      await this.typeSafeEventEmitter.emitAsync(
        SessionEvents.CANCELED,
        new SessionCanceledEvent(updatedSession, actor, actor.centerId!),
      );

      return updatedSession;
    }

    // 3. Handle virtual session (no real session exists)
    // Normalize start time (strip milliseconds for exact matching)
    const normalizedStartTime = resolved.startTime;

    // Fetch group for denormalized fields
    const group = await this.groupsRepository.findByIdOrThrow(
      resolved.groupId,
      ['class'],
    );

    // Virtual cancel materializes a tombstone record: require ACTIVE class
    if (group.class.status !== ClassStatus.ACTIVE) {
      throw SessionsErrors.sessionClassNotActive();
    }

    // Find matching schedule item using optimized database query
    // This validates that startTime matches a schedule item
    const match =
      (await this.sessionsRepository.findMatchingScheduleItemForCancelSession(
        resolved.groupId,
        normalizedStartTime,
      )) as {
        scheduleItemId: string;
        calculatedStartTime: Date;
        calculatedEndTime: Date;
        existingSessionId?: string;
        existingSessionStatus?: SessionStatus;
      } | null;

    if (!match) {
      throw SessionsErrors.sessionScheduleItemNotFound();
    }

    // Double-check if session exists (race condition protection)
    // Even though we checked in resolveSessionFromId, another request might have created it
    if (match.existingSessionId) {
      // Another request created it - update to CANCELED
      await this.sessionsRepository.update(match.existingSessionId, {
        status: SessionStatus.CANCELED,
      });

      const updatedSession = await this.sessionsRepository.findOneOrThrow(
        match.existingSessionId,
      );

      // Emit Event
      await this.typeSafeEventEmitter.emitAsync(
        SessionEvents.CANCELED,
        new SessionCanceledEvent(updatedSession, actor, actor.centerId!),
      );

      return updatedSession;
    }

    // Create CANCELED tombstone record with validated scheduleItemId
    const session = await this.sessionsRepository.create({
      groupId: resolved.groupId,
      centerId: group.centerId,
      branchId: group.branchId,
      classId: group.classId,
      teacherUserProfileId: group.class.teacherUserProfileId,
      scheduleItemId: match.scheduleItemId,
      startTime: normalizedStartTime,
      endTime: match.calculatedEndTime,
      status: SessionStatus.CANCELED,
      isExtraSession: false, // Always false since we matched a schedule item
    });

    // Emit Event
    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.CANCELED,
      new SessionCanceledEvent(session, actor, actor.centerId!),
    );

    // Return created tombstone
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
      throw SessionsErrors.sessionCannotUpdate();
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
    const now = new Date();
    if (isBefore(newStartTime, now)) {
      throw SessionsErrors.sessionStartTimePast();
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
          throw SessionsErrors.sessionScheduleConflict();
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
        throw SessionsErrors.sessionScheduleConflict();
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
      throw SessionsErrors.sessionStatusInvalidForOperation();
    }

    // Check for unmarked students - all students must have attendance records
    const unmarkedCount = await this.sessionsRepository.getUnmarkedStudentCount(
      sessionId,
      session.groupId,
    );

    if (unmarkedCount > 0) {
      // Get total students count from group_students table
      const totalStudents =
        await this.sessionsRepository.getTotalStudentsInGroup(session.groupId);

      throw SessionsErrors.sessionCannotFinishWithUnmarkedStudents({
        unmarkedCount,
        totalStudents,
      });
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

    // Update status to FINISHED and capture actual finish time
    const actualFinishTime = new Date();

    const updatedSession = await this.sessionsRepository.updateThrow(
      sessionId,
      {
        status: SessionStatus.FINISHED,
        actualFinishTime,
      },
    );

    // Emit UPDATED event
    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.UPDATED,
      new SessionUpdatedEvent(updatedSession, actor, actor.centerId!),
    );

    // Emit FINISHED event for teacher payouts and attendance finalization
    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.FINISHED,
      new SessionFinishedEvent(updatedSession, actor),
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
      throw SessionsErrors.sessionStatusInvalidForOperation();
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
    // dto.dateFrom and dto.dateTo are already UTC Date objects (converted by @IsoUtcDate decorator)
    // Use them directly - no timezone conversion needed
    const startDate = dto.dateFrom;
    const endDate = dto.dateTo;

    // Get real sessions with relations loaded
    const realSessions = await this.sessionsRepository.getCalendarSessions(
      dto,
      actor,
    );

    console.log(realSessions);

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
          'class.center', // Add Center relation for timezone
        ]),
      ),
    );

    // Build group map for O(1) lookups
    const groupMap = new Map<string, Group>();
    groups.forEach((group) => groupMap.set(group.id, group));

    // Calculate virtual sessions from schedule items
    const activeScheduleItems = scheduleItems.filter((si) => {
      const group = groupMap.get(si.groupId);
      return group?.class?.status === ClassStatus.ACTIVE;
    });

    const virtualSessions =
      this.sessionVirtualizationService.calculateVirtualSessions(
        activeScheduleItems,
        groupMap,
        startDate,
        endDate,
      );

    // Merge real and virtual sessions (real sessions override virtual ones)
    const mergedSessions = this.sessionVirtualizationService.mergeSessions(
      realSessions,
      virtualSessions,
    );

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

      // Generate ID: real UUID for actual sessions, virtual ID for virtual sessions
      const sessionId = session.id
        ? session.id // Real session - use actual UUID
        : generateVirtualSessionId(
            session.groupId,
            session.startTime,
            session.scheduleItemId,
          );

      return {
        id: sessionId,
        title: session.title || 'Session',
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
        status: session.status,
        groupId: session.groupId,
        actualStartTime:
          'actualStartTime' in session ? session.actualStartTime : undefined,
        actualFinishTime:
          'actualFinishTime' in session ? session.actualFinishTime : undefined,
        isExtraSession: session.isExtraSession,
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
   * Resolve session information from ID (real or virtual)
   * Handles security validation and race condition protection
   *
   * @param sessionId - Session ID (UUID or virtual ID)
   * @param actor - Actor performing the action
   * @returns Resolved session information
   */
  private async resolveSessionFromId(
    sessionId: string,
    actor: ActorUser,
  ): Promise<{
    isReal: boolean;
    realSession?: Session;
    groupId: string;
    startTime: Date;
    scheduleItemId?: string;
  }> {
    // 1. Check if it's a real UUID or virtual ID
    if (isVirtualSessionId(sessionId)) {
      // 2. Parse virtual ID
      const parsed = parseVirtualSessionId(sessionId);
      if (!parsed) {
        throw SessionsErrors.sessionInvalidIdFormat();
      }

      const { groupId, startTime, scheduleItemId } = parsed;

      // 3. CRITICAL: Validate actor has access to groupId (security check)
      const group = await this.groupsRepository.findByIdOrThrow(groupId, [
        'class',
      ]);

      // Verify group belongs to actor's center
      if (group.centerId !== actor.centerId) {
        throw SessionsErrors.sessionAccessDenied();
      }

      // Check if user can bypass center internal access (super admin, center owner, or admin with center access)
      // If bypass is true, skip branch and class access validation
      const canBypassCenterInternalAccess =
        await this.accessControlHelperService.bypassCenterInternalAccess(
          actor.userProfileId,
          actor.centerId,
        );

      if (!canBypassCenterInternalAccess) {
        // Validate branch access
        await this.branchAccessService.validateBranchAccess({
          userProfileId: actor.userProfileId,
          centerId: actor.centerId,
          branchId: group.branchId,
        });

        // Validate class staff access
        await this.classAccessService.validateClassAccess({
          userProfileId: actor.userProfileId,
          classId: group.classId,
        });
      }

      // 4. CRITICAL: Check if real session already exists (race condition protection)
      const normalizedStartTime = new Date(
        Math.floor(startTime.getTime() / 1000) * 1000,
      );
      const existingSession =
        await this.sessionsRepository.findByGroupIdAndStartTime(
          groupId,
          normalizedStartTime,
        );

      if (existingSession) {
        // Real session exists - return it
        return {
          isReal: true,
          realSession: existingSession,
          groupId: existingSession.groupId,
          startTime: existingSession.startTime,
          scheduleItemId: existingSession.scheduleItemId,
        };
      }

      // No real session exists - return virtual session info
      return {
        isReal: false,
        groupId,
        startTime: normalizedStartTime,
        scheduleItemId,
      };
    } else {
      // Real UUID - load session from DB
      const realSession =
        await this.sessionsRepository.findOneOrThrow(sessionId);

      // Validate actor has access (via groupId from session)
      const group = await this.groupsRepository.findByIdOrThrow(
        realSession.groupId,
        ['class'],
      );

      // Verify group belongs to actor's center
      if (group.centerId !== actor.centerId) {
        throw SessionsErrors.sessionAccessDenied();
      }

      // Check if user can bypass center internal access (super admin, center owner, or admin with center access)
      // If bypass is true, skip branch and class access validation
      const canBypassCenterInternalAccess =
        await this.accessControlHelperService.bypassCenterInternalAccess(
          actor.userProfileId,
          actor.centerId,
        );

      if (!canBypassCenterInternalAccess) {
        // Validate branch access
        await this.branchAccessService.validateBranchAccess({
          userProfileId: actor.userProfileId,
          centerId: actor.centerId,
          branchId: group.branchId,
        });

        // Validate class staff access
        await this.classAccessService.validateClassAccess({
          userProfileId: actor.userProfileId,
          classId: group.classId,
        });
      }

      return {
        isReal: true,
        realSession,
        groupId: realSession.groupId,
        startTime: realSession.startTime,
        scheduleItemId: realSession.scheduleItemId,
      };
    }
  }

  /**
   * Get a single session (real or virtual)
   * Handles both real sessions (UUID) and virtual sessions (virtual ID)
   *
   * @param sessionId - Session ID (UUID or virtual ID)
   * @param actor - Actor performing the action
   * @returns Session entity (real) or constructed Session object (virtual)
   */
  async getSession(sessionId: string, actor: ActorUser): Promise<Session> {
    // 1. Resolve session from ID (handles security validation and race condition protection)
    const resolved = await this.resolveSessionFromId(sessionId, actor);

    // 2. If real session exists, load it with all required relations
    if (resolved.isReal && resolved.realSession) {
      return await this.sessionsRepository.findSessionWithRelationsOrThrow(
        resolved.realSession.id,
      );
    }

    // 3. Handle virtual session - construct Session object
    if (!resolved.scheduleItemId) {
      throw SessionsErrors.sessionScheduleItemInvalid();
    }

    const group = await this.groupsRepository.findByIdOrThrow(
      resolved.groupId,
      ['class', 'class.teacher', 'class.teacher.user', 'branch'],
    );

    // Calculate endTime from startTime + class duration
    const endTime = addMinutes(resolved.startTime, group.class.duration);

    // Construct virtual Session object with all required relations
    // Note: This is a virtual session, so some fields (id, createdAt, updatedAt, etc.) are placeholders
    const virtualSession = {
      id: sessionId, // Use virtual ID as identifier
      groupId: resolved.groupId,
      centerId: group.centerId,
      branchId: group.branchId,
      classId: group.classId,
      teacherUserProfileId: group.class.teacher.id, // From class teacher
      scheduleItemId: resolved.scheduleItemId,
      title: undefined,
      startTime: resolved.startTime,
      endTime: endTime,
      actualStartTime: undefined,
      actualFinishTime: undefined,
      status: SessionStatus.SCHEDULED,
      isExtraSession: false,
      // Attendance statistics
      presentCount: 0,
      lateCount: 0,
      excusedCount: 0,
      absentCount: 0,
      totalAttendees: 0,
      // BaseEntity fields
      createdAt: resolved.startTime, // Use startTime as placeholder
      updatedAt: resolved.startTime, // Use startTime as placeholder
      createdByProfileId: actor.userProfileId, // Use actor as placeholder
      updatedByProfileId: undefined,
      // Attach relations to match the expected response structure
      group: {
        id: group.id,
        name: group.name,
      },
      branch: group.branch,
      class: {
        id: group.class.id,
        name: group.class.name,
        teacher: group.class.teacher,
      },
    } as unknown as Session;

    return virtualSession;
  }

  async countActiveTeachersForCenter(centerId: string): Promise<number> {
    return this.sessionsRepository.countActiveTeachersForCenter(centerId);
  }

  async countActiveStudentsForCenter(centerId: string): Promise<number> {
    return this.sessionsRepository.countActiveStudentsForCenter(centerId);
  }
}
