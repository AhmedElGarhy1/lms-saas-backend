import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import {
  SessionCreatedEvent,
  SessionUpdatedEvent,
  SessionDeletedEvent,
  SessionCanceledEvent,
  SessionsBulkDeletedEvent,
  SessionConflictDetectedEvent,
} from '../events/session.events';

/**
 * Listener for Session events to log activity
 */
@Injectable()
export class SessionActivityListener {
  constructor() {}

  @OnEvent(SessionEvents.CREATED)
  async handleSessionCreated(event: SessionCreatedEvent) {
    // Activity logging removed
  }

  @OnEvent(SessionEvents.UPDATED)
  async handleSessionUpdated(event: SessionUpdatedEvent) {
    // Activity logging removed
  }

  @OnEvent(SessionEvents.DELETED)
  async handleSessionDeleted(event: SessionDeletedEvent) {
    // Activity logging removed
  }

  @OnEvent(SessionEvents.CANCELED)
  async handleSessionCanceled(event: SessionCanceledEvent) {
    // Activity logging removed
  }

  @OnEvent(SessionEvents.BULK_DELETED)
  async handleSessionsBulkDeleted(event: SessionsBulkDeletedEvent) {
    // Activity logging removed
  }

  @OnEvent(SessionEvents.CONFLICT_DETECTED)
  async handleSessionConflictDetected(event: SessionConflictDetectedEvent) {
    // Activity logging removed
  }
}
