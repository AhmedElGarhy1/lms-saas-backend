import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import { GroupUpdatedEvent } from '@/modules/classes/events/group.events';
import { SessionsService } from '../services/sessions.service';
import { ScheduleItemsRepository } from '@/modules/classes/repositories/schedule-items.repository';

/**
 * Listener for Group events from classes module
 * Handles session regeneration when group schedules are updated
 * Note: Initial session generation is handled when class transitions from NOT_STARTED to ACTIVE
 */
@Injectable()
export class GroupEventsListener {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly scheduleItemsRepository: ScheduleItemsRepository,
  ) {}

  /**
   * Handle GroupUpdatedEvent - regenerate sessions if schedule items changed
   * Only regenerates when scheduleItems field is in changedFields
   */
  @OnEvent(GroupEvents.UPDATED)
  async handleGroupUpdated(event: GroupUpdatedEvent) {
    const { group, actor, changedFields } = event;

    // Only regenerate if scheduleItems were actually updated
    if (
      !changedFields ||
      !Array.isArray(changedFields) ||
      !changedFields.includes('scheduleItems')
    ) {
      return; // Skip regeneration if schedule items didn't change
    }

    // Query schedule items using repository
    const scheduleItems = await this.scheduleItemsRepository.findByGroupId(
      group.id,
    );

    // Regenerate sessions for each schedule item
    // This will delete future SCHEDULED sessions and regenerate them
    // Services handle their own transactions via @Transactional
    for (const scheduleItem of scheduleItems) {
      await this.sessionsService.regenerateSessionsForScheduleItem(
        scheduleItem.id,
        actor,
      );
    }
  }
}
