import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserEvents } from '@/shared/events/user.events.enum';
import {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserRestoredEvent,
  UserActivatedEvent,
  UserImportedEvent,
} from '../events/user.events';

/**
 * Domain Event Listener for User Activity Logging
 *
 * Handles side effects (activity logging) for user domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class UserActivityListener {
  constructor() {}

  @OnEvent(UserEvents.CREATED)
  async handleUserCreated(event: UserCreatedEvent) {
    // Activity logging removed
  }

  @OnEvent(UserEvents.UPDATED)
  async handleUserUpdated(event: UserUpdatedEvent) {
    // Activity logging removed
  }

  @OnEvent(UserEvents.DELETED)
  async handleUserDeleted(event: UserDeletedEvent) {
    // Activity logging removed
  }

  @OnEvent(UserEvents.RESTORED)
  async handleUserRestored(event: UserRestoredEvent) {
    // Activity logging removed
  }

  @OnEvent(UserEvents.ACTIVATED)
  async handleUserActivated(event: UserActivatedEvent) {
    // Activity logging removed
  }

  @OnEvent(UserEvents.IMPORTED)
  async handleUserImported(event: UserImportedEvent) {
    // Activity logging removed
  }
}
