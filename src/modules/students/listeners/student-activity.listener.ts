import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StudentEvents } from '@/shared/events/student.events.enum';
import { StudentCreatedEvent } from '../events/student.events';

/**
 * Domain Event Listener for Student Activity Logging
 *
 * Handles side effects (activity logging) for student domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class StudentActivityListener {
  constructor() {}

  @OnEvent(StudentEvents.CREATED)
  async handleStudentCreated(event: StudentCreatedEvent) {
    // Activity logging removed
  }
}
