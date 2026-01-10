import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TeacherPayoutService } from './teacher-payout.service';
import { SessionFinishedEvent } from '@/modules/sessions/events/session.events';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import { SessionStatus } from '@/modules/sessions/enums/session-status.enum';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { PaymentStrategyService } from '@/modules/classes/services/payment-strategy.service';
// import { AttendanceRepository } from '@/modules/attendance/repositories/attendance.repository';
import { Session } from '@/modules/sessions/entities/session.entity';

@Injectable()
export class SessionsListener {
  private readonly logger = new Logger(SessionsListener.name);

  constructor(
    private readonly teacherPayoutService: TeacherPayoutService,
    private readonly paymentStrategyService: PaymentStrategyService,
    // private readonly attendanceRepository: AttendanceRepository, // Temporarily disabled due to circular dependency
  ) {}

  @OnEvent(SessionEvents.FINISHED)
  async handleSessionFinished(event: SessionFinishedEvent): Promise<void> {
    try {
      this.logger.log(
        `Processing payouts for finished session: ${event.session.id}`,
      );

      await this.createTeacherPayoutsForSession(event.session);

      this.logger.log(
        `Successfully processed payouts for session: ${event.session.id}`,
      );
    } catch (error) {
      // Log error but don't throw - session completion should not fail due to payout issues
      this.logger.error(
        `Failed to create payouts for session ${event.session.id}:`,
        error,
      );
    }
  }

  private async createTeacherPayoutsForSession(
    session: Session,
  ): Promise<void> {
    // Get teacher payment strategy for the class
    const strategy =
      await this.paymentStrategyService.getTeacherPaymentStrategyForClass(
        session.classId,
      );

    if (!strategy) {
      this.logger.debug(
        `No payment strategy found for class: ${session.classId}`,
      );
      return; // No payout strategy configured
    }

    // Only handle session-based payout types (SESSION, STUDENT, HOUR)
    // MONTH payouts are handled by MonthlyTeacherPayoutJob
    // CLASS payouts are handled by class completion logic (TBD)
    if (
      ![
        TeacherPaymentUnit.SESSION,
        TeacherPaymentUnit.STUDENT,
        TeacherPaymentUnit.HOUR,
      ].includes(strategy.per)
    ) {
      this.logger.debug(
        `Skipping payout for non-session-based unit type: ${strategy.per}`,
      );
      return;
    }

    // Calculate unit count based on strategy
    const unitCount = await this.calculateUnitCount(session, strategy.per);

    if (unitCount <= 0) {
      this.logger.debug(
        `No payout needed for session ${session.id} (unitCount: ${unitCount})`,
      );
      return;
    }

    // Create the payout
    await this.teacherPayoutService.createPayout({
      teacherUserProfileId: session.teacherUserProfileId,
      unitType: strategy.per,
      unitPrice: strategy.amount,
      unitCount: unitCount,
      classId: session.classId,
      sessionId: session.id,
      branchId: session.branchId, // Use session's denormalized branch
      centerId: session.centerId, // Use session's denormalized center
    });

    this.logger.log(
      `Created payout for teacher ${session.teacherUserProfileId}: ` +
        `${unitCount} ${strategy.per} units × ${strategy.amount} = ${unitCount * strategy.amount}`,
    );
  }

  private async calculateUnitCount(
    session: Session,
    unitType: TeacherPaymentUnit,
  ): Promise<number> {
    switch (unitType) {
      case TeacherPaymentUnit.SESSION:
        // Always 1 unit per session
        return 1;

      case TeacherPaymentUnit.STUDENT:
        // Count present students - temporarily disabled due to circular dependency
        // TODO: Re-enable when circular dependency is resolved
        this.logger.warn(
          `STUDENT payment unit calculation disabled for session ${session.id} due to circular dependency`,
        );
        return 0;

      case TeacherPaymentUnit.HOUR:
        // Calculate session duration in hours
        const durationMs =
          session.endTime.getTime() - session.startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60); // Convert to hours

        // Round to 2 decimal places (e.g., 1.5 hours for 90 minutes)
        return Math.round(durationHours * 100) / 100;

      default:
        return 0;
    }
  }
}
