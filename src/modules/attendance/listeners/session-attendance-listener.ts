import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { SessionsRepository } from '@/modules/sessions/repositories/sessions.repository';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import { SessionFinishedEvent } from '@/modules/sessions/events/session.events';

/**
 * Listener for session attendance events
 * Calculates and stores attendance statistics when sessions finish
 */
@Injectable()
export class SessionAttendanceListener {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  /**
   * Calculate and store attendance statistics when a session finishes
   */
  @OnEvent(SessionEvents.FINISHED)
  async onSessionFinished(event: SessionFinishedEvent): Promise<void> {
    const { session } = event;

    try {
      // Calculate attendance statistics for the finished session
      const attendanceStats =
        await this.attendanceRepository.calculateSessionAttendanceStats({
          sessionId: session.id,
          groupId: session.groupId,
        });

      console.log(attendanceStats);

      const { present, late, excused, absent } = attendanceStats;

      // Update the session with attendance statistics
      await this.sessionsRepository.update(session.id, {
        presentCount: present,
        lateCount: late,
        excusedCount: excused,
        absentCount: absent,
      });
    } catch (error) {
      // Log error but don't fail the session finish process
      console.error(
        `Failed to calculate attendance stats for session ${session.id}:`,
        error,
      );
    }
  }
}
