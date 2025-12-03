import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { StudentActivityType } from '../enums/student-activity-type.enum';
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
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(StudentEvents.CREATED)
  async handleStudentCreated(event: StudentCreatedEvent) {
    const { user, student, centerId } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      StudentActivityType.STUDENT_CREATED,
      {
        studentId: student.id,
        phone: user.phone,
        centerId: centerId,
      },
      user.id,
    );
  }
}
