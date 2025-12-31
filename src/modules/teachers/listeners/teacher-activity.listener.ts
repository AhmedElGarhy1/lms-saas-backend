import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TeacherEvents } from '@/shared/events/teacher.events.enum';
import { TeacherCreatedEvent } from '../events/teacher.events';

/**
 * Domain Event Listener for Teacher Activity Logging
 *
 * Handles side effects (activity logging) for teacher domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class TeacherActivityListener {
  constructor() {}

  @OnEvent(TeacherEvents.CREATED)
  async handleTeacherCreated(event: TeacherCreatedEvent) {
    // Activity logging removed
  }
}
