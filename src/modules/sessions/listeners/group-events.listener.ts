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
   * Handle ScheduleItemsUpdatedEvent
   * Note: Session updates are now handled directly in GroupsService.updateGroup()
   * before schedule items are updated, to prevent foreign key constraint violations.
   * This listener is kept for backward compatibility and potential future use.
   */
  @OnEvent(GroupEvents.SCHEDULE_ITEMS_UPDATED)
  async handleScheduleItemsUpdated(event: ScheduleItemsUpdatedEvent) {
    // Sessions are now handled in GroupsService.updateGroup() before schedule items are updated
    // This prevents foreign key constraint violations when deleting schedule items
    // This listener is kept for potential future use or other listeners that might need this event
  }
}
