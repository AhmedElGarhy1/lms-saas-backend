import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import {
  ClassCreatedEvent,
  ClassUpdatedEvent,
  ClassDeletedEvent,
  ClassRestoredEvent,
  ClassExportedEvent,
  ClassStatusChangedEvent,
} from '../events/class.events';

/**
 * Domain Event Listener for Class Activity Logging
 *
 * Handles side effects (activity logging) for class domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class ClassActivityListener {
  constructor() {}

  @OnEvent(ClassEvents.CREATED)
  async handleClassCreated(event: ClassCreatedEvent) {
    // Activity logging removed
  }

  @OnEvent(ClassEvents.UPDATED)
  async handleClassUpdated(event: ClassUpdatedEvent) {
    // Activity logging removed
  }

  @OnEvent(ClassEvents.DELETED)
  async handleClassDeleted(event: ClassDeletedEvent) {
    // Activity logging removed
  }

  @OnEvent(ClassEvents.RESTORED)
  async handleClassRestored(event: ClassRestoredEvent) {
    // Activity logging removed
  }

  @OnEvent(ClassEvents.EXPORTED)
  async handleClassExported(event: ClassExportedEvent) {
    // Activity logging removed
  }

  @OnEvent(ClassEvents.STATUS_CHANGED)
  async handleClassStatusChanged(event: ClassStatusChangedEvent) {
    // Activity logging removed
  }
}
