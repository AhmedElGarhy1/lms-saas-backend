import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import {
  GroupCreatedEvent,
  GroupUpdatedEvent,
  ScheduleItemsUpdatedEvent,
} from '@/modules/classes/events/group.events';
import { ClassStatus } from '@/modules/classes/enums/class-status.enum';
import { SessionsService } from '../services/sessions.service';
import { SessionGenerationService } from '../services/session-generation.service';

/**
 * Listener for Group events from classes module
 * Handles session generation when groups are created (if class is ACTIVE)
 * and smart session updates when group schedules are updated
 */
@Injectable()
export class GroupEventsListener {
  private readonly logger = new Logger(GroupEventsListener.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionGenerationService: SessionGenerationService,
  ) {}

  /**
   * Handle GroupCreatedEvent - generate sessions if class is ACTIVE
   * If class is NOT_STARTED, sessions will be generated when class transitions to ACTIVE
   */
  @OnEvent(GroupEvents.CREATED)
  async handleGroupCreated(event: GroupCreatedEvent) {
    const { group, classEntity, actor } = event;

    // Only generate sessions if class is already ACTIVE
    // If class is NOT_STARTED, sessions will be generated when class transitions to ACTIVE
    if (
      classEntity.status === ClassStatus.ACTIVE ||
      classEntity.status === ClassStatus.PAUSED
    ) {
      try {
        const sessions =
          await this.sessionGenerationService.generateInitialSessionsForGroup(
            group.id,
            actor,
          );

        this.logger.log(
          `Generated ${sessions.length} initial sessions for group ${group.id} (class ${classEntity.id} is ACTIVE)`,
        );
      } catch (error) {
        // Log error but don't throw - this prevents blocking other event handlers
        this.logger.error(
          `Failed to generate sessions for group ${group.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  /**
   * Handle GroupUpdatedEvent - keep for backward compatibility
   * Note: Schedule items updates are now handled by ScheduleItemsUpdatedEvent
   */
  @OnEvent(GroupEvents.UPDATED)
  async handleGroupUpdated(event: GroupUpdatedEvent) {
    // Schedule items updates are handled by ScheduleItemsUpdatedEvent
    // This handler is kept for other group updates (e.g., name changes)
  }

  /**
   * Handle ScheduleItemsUpdatedEvent - smart update sessions based on old vs new state
   * Compares old and new schedule items and updates sessions intelligently
   */
  @OnEvent(GroupEvents.SCHEDULE_ITEMS_UPDATED)
  async handleScheduleItemsUpdated(event: ScheduleItemsUpdatedEvent) {
    const { groupId, oldScheduleItems, newScheduleItems, actor } = event;

    try {
      const result =
        await this.sessionsService.updateSessionsForScheduleItemsChange(
          groupId,
          oldScheduleItems,
          newScheduleItems,
          actor,
        );

      this.logger.log(
        `Updated sessions for group ${groupId}: ${result.added} added, ${result.removed} removed, ${result.updated} updated, ${result.conflicts} conflicts`,
      );
    } catch (error) {
      // Log error but don't throw - this prevents blocking other event handlers
      this.logger.error(
        `Failed to update sessions for group ${groupId} after schedule items change: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
