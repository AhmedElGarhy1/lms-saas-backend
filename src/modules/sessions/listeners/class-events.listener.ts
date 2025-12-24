import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import { ClassUpdatedEvent } from '@/modules/classes/events/class.events';
import { SessionsService } from '../services/sessions.service';

/**
 * Listener for Class events from classes module
 * With virtual sessions, no pre-generation is needed - sessions are calculated on-demand
 * Note: Session cleanup is still handled by the nightly SessionCleanupJob
 */
@Injectable()
export class ClassEventsListener {
  private readonly logger = new Logger(ClassEventsListener.name);

  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * Handle ClassStatusChangedEvent
   * No action needed - virtual sessions are calculated on-demand when queried
   * Note: Session cleanup is handled by the nightly SessionCleanupJob for hard-locked classes (>24 hours)
   */
  @OnEvent(ClassEvents.STATUS_CHANGED)
  handleClassStatusChanged() {
    // Virtual sessions are calculated on-demand, no pre-generation needed
    this.logger.debug(
      'Class status changed - sessions will be calculated on-demand',
    );
  }

  /**
   * Handle ClassUpdatedEvent - update session endTime if duration changed
   * Only updates when duration field is in changedFields
   */
  @OnEvent(ClassEvents.UPDATED)
  handleClassUpdated(event: ClassUpdatedEvent) {}
}
