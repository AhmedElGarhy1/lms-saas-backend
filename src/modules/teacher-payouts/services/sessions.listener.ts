import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { TeacherPayoutService } from './teacher-payout.service';
import { SessionFinishedEvent } from '@/modules/sessions/events/session.events';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import { SessionStatus } from '@/modules/sessions/enums/session-status.enum';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { PaymentStrategyService } from '@/modules/classes/services/payment-strategy.service';
import { Session } from '@/modules/sessions/entities/session.entity';

@Injectable()
export class SessionsListener {
  private readonly logger = new Logger(SessionsListener.name);

  constructor(
    private readonly teacherPayoutService: TeacherPayoutService,
    private readonly paymentStrategyService: PaymentStrategyService,
    @InjectDataSource() private readonly dataSource: DataSource,
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

  private async calculateStudentUnitCount(session: Session): Promise<number> {
    try {
      const result = await this.dataSource.query(`
        SELECT COUNT(*)::int as present_count
        FROM attendance
        WHERE "sessionId" = $1
        AND status IN ($2, $3)  -- Only PRESENT and LATE (students who attended)
        AND "deletedAt" IS NULL
      `, [session.id, 'PRESENT', 'LATE']);

      return result[0]?.present_count || 0;
    } catch (error) {
      this.logger.error(
        `Failed to count present students for session ${session.id}:`,
        error
      );
      return 0; // Fallback to 0 on error
    }
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
        // Count present and late students (students who actually attended)
        return await this.calculateStudentUnitCount(session);

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
