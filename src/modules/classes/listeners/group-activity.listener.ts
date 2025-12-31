import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import {
  GroupCreatedEvent,
  GroupUpdatedEvent,
  GroupDeletedEvent,
  GroupRestoredEvent,
  GroupExportedEvent,
} from '../events/group.events';

/**
 * Domain Event Listener for Group Activity Logging
 *
 * Handles side effects (activity logging) for group domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class GroupActivityListener {
  constructor() {}

  @OnEvent(GroupEvents.CREATED)
  async handleGroupCreated(event: GroupCreatedEvent) {
    // Activity logging removed
  }

  @OnEvent(GroupEvents.UPDATED)
  async handleGroupUpdated(event: GroupUpdatedEvent) {
    // Activity logging removed
  }

  @OnEvent(GroupEvents.DELETED)
  async handleGroupDeleted(event: GroupDeletedEvent) {
    // Activity logging removed
  }

  @OnEvent(GroupEvents.RESTORED)
  async handleGroupRestored(event: GroupRestoredEvent) {
    // Activity logging removed
  }

  @OnEvent(GroupEvents.EXPORTED)
  async handleGroupExported(event: GroupExportedEvent) {
    // Activity logging removed
  }
}
