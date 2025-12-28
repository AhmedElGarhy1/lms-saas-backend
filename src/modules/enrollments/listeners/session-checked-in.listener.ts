import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SessionCheckedInEvent } from '@/modules/sessions/events/session.events';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import { EnrollmentService } from '../services/enrollment.service';
import { AbsenteePolicy } from '@/modules/classes/enums/absentee-policy.enum';
import { Transactional } from '@nestjs-cls/transactional';
import { SessionsRepository } from '@/modules/sessions/repositories/sessions.repository';
import { EnrollmentStatus, PaymentMethod } from '../entities/enrollment.entity';

@Injectable()
export class SessionCheckedInListener {
  private readonly logger = new Logger(SessionCheckedInListener.name);

  constructor(
    private readonly enrollmentService: EnrollmentService,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  /**
   * Automatically finalize enrollments when a session is checked in
   * This replaces the manual finalize-payments endpoint
   */
  @OnEvent(SessionEvents.CHECKED_IN)
  @Transactional()
  async handleSessionCheckedIn(event: SessionCheckedInEvent): Promise<void> {
    const { session: basicSession } = event;

    try {
      this.logger.log(
        `Session ${basicSession.id} checked in - starting immediate enrollment finalization`,
      );

      // Fetch session with full relations needed for enrollment processing
      const session = await this.sessionsRepository.findByIdWithRelations(
        basicSession.id,
        ['group', 'group.class'],
      );

      const classData = session.group?.class;
      if (!classData) {
        this.logger.warn(
          `Session ${session.id} missing class data for enrollment finalization`,
        );
        return;
      }

      const absenteePolicy = classData.absenteePolicy;

      this.logger.log(
        `Applying ${absenteePolicy} policy to session ${session.id}`,
      );

      // Get all enrollments for this session that need finalization
      const lockedEnrollments =
        await this.enrollmentService.getLockedEnrollmentsForSession(
          session.id,
        );

      if (lockedEnrollments.length === 0) {
        this.logger.log(`No enrollments to finalize for session ${session.id}`);
        return;
      }

      // Apply the appropriate policy
      if (absenteePolicy === AbsenteePolicy.STRICT) {
        await this.processStrictEnrollments(lockedEnrollments, session.id);
      } else if (absenteePolicy === AbsenteePolicy.FLEXIBLE) {
        await this.processFlexibleEnrollments(lockedEnrollments, session.id);
      } else if (absenteePolicy === AbsenteePolicy.MANUAL) {
        this.logger.log(
          `Session ${session.id} uses MANUAL policy - no automatic enrollment processing`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to finalize enrollments for session ${basicSession.id}:`,
        error,
      );
      // Don't throw - we don't want session finishing to fail due to enrollment issues
    }
  }

  /**
   * Process STRICT policy: Auto-charge all enrolled students
   */
  private async processStrictEnrollments(
    enrollments: any[],
    sessionId: string,
  ): Promise<void> {
    for (const enrollment of enrollments) {
      try {
        if (enrollment.paymentMethod === PaymentMethod.CASH) {
          // Cash enrollments are already completed, just ensure status is correct
          this.logger.log(
            `STRICT policy: Cash enrollment ${enrollment.id} already completed`,
          );
        } else {
          // Complete wallet and package enrollments
          await this.enrollmentService.markAsAttended(
            enrollment.id,
          );
          this.logger.log(
            `STRICT policy: Auto-charged enrollment ${enrollment.id} for session ${sessionId}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to process STRICT enrollment ${enrollment.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Process FLEXIBLE policy: Only charge students who attended
   */
  private async processFlexibleEnrollments(
    enrollments: any[],
    sessionId: string,
  ): Promise<void> {
    for (const enrollment of enrollments) {
      try {
        if (enrollment.status === EnrollmentStatus.PAID) {
          // Student already marked as attended, enrollment is valid
          this.logger.log(
            `FLEXIBLE policy: Keeping enrollment ${enrollment.id} (student attended)`,
          );
        } else {
          // Student didn't attend, refund/release the enrollment
          await this.enrollmentService.markAsNoShow(enrollment.id);
          this.logger.log(
            `FLEXIBLE policy: Refunded enrollment ${enrollment.id} (student absent)`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to process FLEXIBLE enrollment ${enrollment.id}:`,
          error,
        );
      }
    }
  }
}
