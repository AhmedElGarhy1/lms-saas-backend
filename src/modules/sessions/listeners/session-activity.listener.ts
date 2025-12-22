import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { SessionActivityType } from '../enums/session-activity-type.enum';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import {
  SessionCreatedEvent,
  SessionUpdatedEvent,
  SessionDeletedEvent,
  SessionCanceledEvent,
  SessionsRegeneratedEvent,
  SessionsBulkCreatedEvent,
  SessionsBulkDeletedEvent,
  SessionConflictDetectedEvent,
} from '../events/session.events';

/**
 * Listener for Session events to log activity
 */
@Injectable()
export class SessionActivityListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(SessionEvents.CREATED)
  async handleSessionCreated(event: SessionCreatedEvent) {
    const { session, actor, centerId } = event;

    await this.activityLogService.log(
      SessionActivityType.SESSION_CREATED,
      {
        sessionId: session.id,
        groupId: session.groupId,
        scheduleItemId: session.scheduleItemId,
        title: session.title,
        startTime: session.startTime,
        endTime: session.endTime,
        isExtraSession: session.isExtraSession,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(SessionEvents.UPDATED)
  async handleSessionUpdated(event: SessionUpdatedEvent) {
    const { session, actor, centerId } = event;

    await this.activityLogService.log(
      SessionActivityType.SESSION_UPDATED,
      {
        sessionId: session.id,
        groupId: session.groupId,
        title: session.title,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(SessionEvents.DELETED)
  async handleSessionDeleted(event: SessionDeletedEvent) {
    const { sessionId, actor, centerId } = event;

    await this.activityLogService.log(
      SessionActivityType.SESSION_DELETED,
      {
        sessionId: sessionId,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(SessionEvents.CANCELED)
  async handleSessionCanceled(event: SessionCanceledEvent) {
    const { session, actor, centerId } = event;

    await this.activityLogService.log(
      SessionActivityType.SESSION_CANCELED,
      {
        sessionId: session.id,
        groupId: session.groupId,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(SessionEvents.REGENERATED)
  async handleSessionsRegenerated(event: SessionsRegeneratedEvent) {
    const {
      scheduleItemId,
      groupId,
      deletedCount,
      createdCount,
      actor,
      centerId,
    } = event;

    await this.activityLogService.log(
      SessionActivityType.SESSIONS_REGENERATED,
      {
        scheduleItemId: scheduleItemId,
        groupId: groupId,
        deletedCount: deletedCount,
        createdCount: createdCount,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(SessionEvents.BULK_CREATED)
  async handleSessionsBulkCreated(event: SessionsBulkCreatedEvent) {
    const { sessions, actor, centerId } = event;

    await this.activityLogService.log(
      SessionActivityType.SESSION_CREATED,
      {
        sessionCount: sessions.length,
        groupIds: [...new Set(sessions.map((s) => s.groupId))],
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(SessionEvents.BULK_DELETED)
  async handleSessionsBulkDeleted(event: SessionsBulkDeletedEvent) {
    const { sessionIds, actor, centerId } = event;

    await this.activityLogService.log(
      SessionActivityType.SESSION_DELETED,
      {
        sessionCount: sessionIds.length,
        sessionIds: sessionIds,
        centerId: centerId,
      },
      actor.id,
    );
  }

  @OnEvent(SessionEvents.CONFLICT_DETECTED)
  async handleSessionConflictDetected(event: SessionConflictDetectedEvent) {
    const {
      groupId,
      scheduleItemId,
      proposedStartTime,
      proposedEndTime,
      conflictType,
      conflictingSessionId,
      conflictingSessionStartTime,
      conflictingSessionEndTime,
      actor,
      centerId,
    } = event;

    await this.activityLogService.log(
      SessionActivityType.CONFLICT_DETECTED,
      {
        groupId: groupId,
        scheduleItemId: scheduleItemId,
        proposedStartTime: proposedStartTime,
        proposedEndTime: proposedEndTime,
        conflictType: conflictType,
        conflictingSessionId: conflictingSessionId,
        conflictingSessionStartTime: conflictingSessionStartTime,
        conflictingSessionEndTime: conflictingSessionEndTime,
        centerId: centerId,
      },
      actor.id,
    );
  }
}
