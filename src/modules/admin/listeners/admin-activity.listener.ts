import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { AdminCreatedEvent } from '../events/admin.events';

/**
 * Domain Event Listener for Admin Activity Logging
 *
 * Handles side effects (activity logging) for admin domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class AdminActivityListener {
  constructor() {}

  @OnEvent(AdminEvents.CREATED)
  async handleAdminCreated(event: AdminCreatedEvent) {
    // Activity logging removed
  }
}
