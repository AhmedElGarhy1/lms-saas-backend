import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { TeacherActivityType } from '../enums/teacher-activity-type.enum';
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
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(TeacherEvents.CREATED)
  async handleTeacherCreated(event: TeacherCreatedEvent) {
    const { user, teacher, centerId } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      TeacherActivityType.TEACHER_CREATED,
      {
        teacherId: teacher.id,
        phone: user.phone,
        centerId: centerId,
      },
      user.id,
    );
  }
}
