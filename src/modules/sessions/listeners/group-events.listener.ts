import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import {
  GroupCreatedEvent,
  GroupUpdatedEvent,
} from '@/modules/classes/events/group.events';

/**
 * Listener for Group events from classes module
 * With virtual sessions, no pre-generation is needed - sessions are calculated on-demand
 */
@Injectable()
export class GroupEventsListener {
  private readonly logger = new Logger(GroupEventsListener.name);

  constructor() {}

  /**
   * Handle GroupCreatedEvent
   * No action needed - virtual sessions will be calculated on-demand when queried
   */
  @OnEvent(GroupEvents.CREATED)
  handleGroupCreated(event: GroupCreatedEvent) {
    // Virtual sessions are calculated on-demand, no pre-generation needed
    this.logger.debug(
      `Group ${event.group.id} created - sessions will be calculated on-demand`,
    );
  }

  /**
   * Handle GroupUpdatedEvent
   * No action needed - virtual sessions automatically reflect schedule changes
   */
  @OnEvent(GroupEvents.UPDATED)
  handleGroupUpdated(event: GroupUpdatedEvent) {
    // Virtual sessions automatically reflect schedule changes, no action needed
    this.logger.debug(
      `Group ${event.group.id} updated - virtual sessions will reflect changes on-demand`,
    );
  }
}
