import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import { SessionUpdatedEvent } from '@/modules/sessions/events/session.events';
import { SessionStatus } from '@/modules/sessions/enums/session-status.enum';
import { AttendanceService } from '../services/attendance.service';

@Injectable()
export class AttendanceSessionListener {
  private readonly logger = new Logger(AttendanceSessionListener.name);

  constructor(private readonly attendanceService: AttendanceService) {}

  @OnEvent(SessionEvents.UPDATED)
  async handleSessionUpdated(event: SessionUpdatedEvent) {
    if (event.session.status !== SessionStatus.FINISHED) {
      return;
    }

    const inserted =
      await this.attendanceService.autoMarkAbsenteesOnSessionFinished(
        event.session.id,
        event.actor,
      );

    this.logger.debug(
      `Auto-marked ${inserted} absences for session ${event.session.id}`,
    );
  }
}
