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
} from '../events/session.events';
import { Session } from '../entities/session.entity';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { PaginateSessionsDto } from '../dto/paginate-sessions.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { SessionStatus } from '../enums/session-status.enum';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { Transactional } from '@nestjs-cls/transactional';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { ScheduleItemsRepository } from '@/modules/classes/repositories/schedule-items.repository';

@Injectable()
export class SessionsService extends BaseService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly sessionValidationService: SessionValidationService,
    private readonly sessionGenerationService: SessionGenerationService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly groupsRepository: GroupsRepository,
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
    // Fetch group with class to get teacherUserProfileId using repository
    const group = await this.groupsRepository.findByIdOrThrow(groupId, [
      'class',
    ]);

    const teacherUserProfileId = group.class.teacherUserProfileId;

    const startTime = new Date(createSessionDto.startTime);
    const endTime = new Date(createSessionDto.endTime);

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
   * Only SCHEDULED sessions can be updated
   * @param sessionId - Session ID
   * @param updateSessionDto - Update data
   * @param actor - Actor performing the action
   */
  @Transactional()
  async updateSession(
    sessionId: string,
    updateSessionDto: UpdateSessionDto,
    actor: ActorUser,
  ): Promise<Session> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BusinessLogicException('t.messages.cannotDeleteSession', {
        status: session.status,
      });
    }

    // Fetch group with class to get teacherUserProfileId if time is changing
    let teacherUserProfileId: string | undefined;
    if (updateSessionDto.startTime || updateSessionDto.endTime) {
      const group = await this.groupsRepository.findById(session.groupId, [
        'class',
      ]);

      if (group) {
        teacherUserProfileId = group.class.teacherUserProfileId;
      }

      const newStartTime = updateSessionDto.startTime
        ? new Date(updateSessionDto.startTime)
        : session.startTime;
      const newEndTime = updateSessionDto.endTime
        ? new Date(updateSessionDto.endTime)
        : session.endTime;

      // Validate teacher conflict if time changed
      if (
        newStartTime.getTime() !== session.startTime.getTime() ||
        newEndTime.getTime() !== session.endTime.getTime()
      ) {
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
    }

    const updatedSession = await this.sessionsRepository.updateThrow(
      sessionId,
      {
        title: updateSessionDto.title,
        startTime: updateSessionDto.startTime
          ? new Date(updateSessionDto.startTime)
          : undefined,
        endTime: updateSessionDto.endTime
          ? new Date(updateSessionDto.endTime)
          : undefined,
      },
    );

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
    await this.sessionValidationService.validateSessionDeletion(sessionId);

    await this.sessionsRepository.remove(sessionId);

    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.DELETED,
      new SessionDeletedEvent(sessionId, actor, actor.centerId!),
    );
  }

  /**
   * Cancel a session
   * Sets status to CANCELED
   * TODO: Trigger refund logic
   * @param sessionId - Session ID
   * @param actor - Actor performing the action
   */
  @Transactional()
  async cancelSession(sessionId: string, actor: ActorUser): Promise<Session> {
    const updatedSession = await this.sessionsRepository.updateThrow(
      sessionId,
      {
        status: SessionStatus.CANCELED,
      },
    );

    await this.typeSafeEventEmitter.emitAsync(
      SessionEvents.CANCELED,
      new SessionCanceledEvent(updatedSession, actor, actor.centerId!),
    );

    return updatedSession;
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
   * Get a single session
   * @param sessionId - Session ID
   * @param actor - Actor performing the action
   */
  async getSession(sessionId: string, actor: ActorUser): Promise<Session> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    // Validate group belongs to actor's center using repository
    const group = await this.groupsRepository.findOne(session.groupId);

    if (!group || group.centerId !== actor.centerId) {
      throw new BusinessLogicException('t.messages.withIdNotFound', {
        resource: 't.resources.session',
        identifier: 't.resources.identifier',
        value: sessionId,
      });
    }

    return session;
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
    // Calculate date range (2 months from now)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 2);

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
}
