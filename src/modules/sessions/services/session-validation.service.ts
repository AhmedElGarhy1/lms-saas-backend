import { Injectable } from '@nestjs/common';
import { SessionsRepository } from '../repositories/sessions.repository';
import { BaseService } from '@/shared/common/services/base.service';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { SessionStatus } from '../enums/session-status.enum';

@Injectable()
export class SessionValidationService extends BaseService {
  constructor(private readonly sessionsRepository: SessionsRepository) {
    super();
  }

  /**
   * Validate teacher conflict for a session time slot
   * @param teacherUserProfileId - The teacher's user profile ID
   * @param startTime - Session start time
   * @param endTime - Session end time
   * @param excludeSessionId - Optional session ID to exclude from conflict check (for updates)
   * @returns Conflict data if found, null otherwise
   */
  async validateTeacherConflict(
    teacherUserProfileId: string,
    startTime: Date,
    endTime: Date,
    excludeSessionId?: string,
  ): Promise<{ sessionId: string; startTime: Date; endTime: Date } | null> {
    const overlappingSessions =
      await this.sessionsRepository.findOverlappingSessions(
        teacherUserProfileId,
        startTime,
        endTime,
        excludeSessionId,
      );

    if (overlappingSessions.length > 0) {
      const conflict = overlappingSessions[0];
      return {
        sessionId: conflict.id,
        startTime: conflict.startTime,
        endTime: conflict.endTime,
      };
    }

    return null;
  }

  /**
   * Validate group conflict for a session time slot
   * Ensures a group doesn't have overlapping sessions
   * @param groupId - The group ID
   * @param startTime - Session start time
   * @param endTime - Session end time
   * @param excludeSessionId - Optional session ID to exclude from conflict check (for updates)
   * @returns Conflict data if found, null otherwise
   */
  async validateGroupConflict(
    groupId: string,
    startTime: Date,
    endTime: Date,
    excludeSessionId?: string,
  ): Promise<{ sessionId: string; startTime: Date; endTime: Date } | null> {
    const overlappingSessions =
      await this.sessionsRepository.findOverlappingSessionsByGroup(
        groupId,
        startTime,
        endTime,
        excludeSessionId,
      );

    if (overlappingSessions.length > 0) {
      const conflict = overlappingSessions[0];
      return {
        sessionId: conflict.id,
        startTime: conflict.startTime,
        endTime: conflict.endTime,
      };
    }

    return null;
  }

  /**
   * Validate if a session can be deleted
   * Only SCHEDULED extra sessions (isExtraSession: true) can be deleted
   * Scheduled sessions (isExtraSession: false) must be canceled instead
   * TODO: Check if payments exist (placeholder for future)
   * TODO: Check if attendance exists (placeholder for future)
   * @param sessionId - Session ID to validate
   * @throws BusinessLogicException if session cannot be deleted
   */
  async validateSessionDeletion(sessionId: string): Promise<void> {
    const session = await this.sessionsRepository.findOneOrThrow(sessionId);

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BusinessLogicException('t.messages.cannotDeleteSession', {
        status: session.status,
      });
    }

    // Only extra sessions (isExtraSession: true) can be deleted
    // Scheduled sessions (isExtraSession: false) must be canceled instead
    if (!session.isExtraSession) {
      throw new BusinessLogicException(
        't.messages.cannotDeleteScheduledSession',
      );
    }

    // TODO: Check if payments exist
    // TODO: Check if attendance exists
    // If payments or attendance exist, throw BusinessLogicException
  }
}
