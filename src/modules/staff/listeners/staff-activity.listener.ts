import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StaffEvents } from '@/shared/events/staff.events.enum';
import { StaffCreatedEvent } from '../events/staff.events';

/**
 * Domain Event Listener for Staff Activity Logging
 *
 * Handles side effects (activity logging) for staff domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class StaffActivityListener {
  constructor() {}

  @OnEvent(StaffEvents.CREATED)
  async handleStaffCreated(event: StaffCreatedEvent) {
    // Activity logging removed
  }
}
