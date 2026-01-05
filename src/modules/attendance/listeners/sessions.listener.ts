import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import { SessionFinishedEvent } from '@/modules/sessions/events/session.events';
import { AttendanceService } from '../services/attendance.service';

@Injectable()
export class SessionListener {
  private readonly logger = new Logger(SessionListener.name);

  constructor(private readonly attendanceService: AttendanceService) {}

  @OnEvent(SessionEvents.FINISHED)
  async handleSessionFinished(event: SessionFinishedEvent) {
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
