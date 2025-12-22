import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import {
  ClassStatusChangedEvent,
  ClassUpdatedEvent,
} from '@/modules/classes/events/class.events';
import { ClassStatus } from '@/modules/classes/enums/class-status.enum';
import { SessionGenerationService } from '../services/session-generation.service';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { SessionsService } from '../services/sessions.service';

/**
 * Listener for Class events from classes module
 * Handles session generation when class becomes ACTIVE and session cleanup (via cronjob)
 */
@Injectable()
export class ClassEventsListener {
  private readonly logger = new Logger(ClassEventsListener.name);

  constructor(
    private readonly sessionGenerationService: SessionGenerationService,
    private readonly groupsRepository: GroupsRepository,
    private readonly sessionsService: SessionsService,
  ) {}

  /**
   * Handle ClassStatusChangedEvent
   * - Generates initial sessions when class transitions from NOT_STARTED to ACTIVE
   * - Note: Session cleanup is handled by the nightly SessionCleanupJob
   * - Sessions remain in the database when a class is marked CANCELED or FINISHED
   * - and are cleaned up after the 24-hour grace period expires
   */
  @OnEvent(ClassEvents.STATUS_CHANGED)
  async handleClassStatusChanged(event: ClassStatusChangedEvent) {
    const { classId, oldStatus, newStatus, actor } = event;

    // Generate sessions when class transitions from NOT_STARTED to ACTIVE
    // This is the first time the class becomes active, so we generate initial sessions
    // For PAUSED → ACTIVE, sessions already exist, so we don't regenerate
    if (
      oldStatus === ClassStatus.NOT_STARTED &&
      newStatus === ClassStatus.ACTIVE
    ) {
      // Query all groups for this class using repository
      const groups = await this.groupsRepository.findByClassId(classId);

      // Generate initial sessions for each group
      // Service handles transactions via @Transactional decorator
      for (const group of groups) {
        try {
          await this.sessionGenerationService.generateInitialSessionsForGroup(
            group.id,
            actor,
          );
        } catch (error) {
          // Log error but continue with other groups
          // This prevents one group's failure from blocking others
          this.logger.error(
            `Failed to generate sessions for group ${group.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }

    // Sessions are no longer deleted immediately when a class is canceled or finished
    // Cleanup is handled by the nightly SessionCleanupJob for hard-locked classes (>24 hours)
    // This allows for a 24-hour grace period where classes can be reverted back to ACTIVE
  }

  /**
   * Handle ClassUpdatedEvent - update session endTime if duration changed
   * Only updates when duration field is in changedFields
   */
  @OnEvent(ClassEvents.UPDATED)
  async handleClassUpdated(event: ClassUpdatedEvent) {
    const { classEntity, actor, changedFields } = event;

    // Only update if duration was updated
    if (
      !changedFields ||
      !Array.isArray(changedFields) ||
      !changedFields.includes('duration')
    ) {
      return; // Skip update if duration didn't change
    }

    try {
      // Update endTime for all future SCHEDULED sessions in the class
      const result =
        await this.sessionsService.updateSessionsEndTimeForDurationChange(
          classEntity.id,
          classEntity.duration,
          actor,
        );

      this.logger.log(
        `Updated ${result.updated} sessions and detected ${result.conflicts} conflicts for class ${classEntity.id} after duration change`,
      );
    } catch (error) {
      // Log error but don't throw - this prevents blocking other event handlers
      this.logger.error(
        `Failed to update sessions for class ${classEntity.id} after duration change: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
