import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { StudentChargesRepository } from '../repositories/student-charges.repository';
import { StudentCharge } from '../entities/student-charge.entity';
import { StudentChargeType, StudentChargeStatus } from '../enums';
import { AttendanceRepository } from '@/modules/attendance/repositories/attendance.repository';
import { SessionsRepository } from '@/modules/sessions/repositories/sessions.repository';
import { PaymentService } from '@/modules/finance/services/payment.service';
import { StudentPaymentStrategyRepository } from '@/modules/classes/repositories/student-payment-strategy.repository';
import { Payment } from '@/modules/finance/entities/payment.entity';
import { PaymentStatus } from '@/modules/finance/enums/payment-status.enum';
import { Money } from '@/shared/common/utils/money.util';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { StudentBillingErrors } from '../exceptions/student-billing.errors';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';

@Injectable()
export class StudentBillingRefundService {
  private readonly logger = new Logger(StudentBillingRefundService.name);

  constructor(
    private readonly chargesRepo: StudentChargesRepository,
    private readonly attendanceRepo: AttendanceRepository,
    private readonly paymentService: PaymentService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  @Transactional()
  async refundStudentBilling(
    chargeId: string,
    reason: string | undefined,
    actor: ActorUser,
  ): Promise<StudentCharge> {
    // 1. Get and validate charge
    const charge = await this.chargesRepo.findById(chargeId);
    if (!charge) {
      throw StudentBillingErrors.billingRecordNotFound();
    }

    // 2. Validate center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: charge.centerId,
    });

    // 3. Check if already refunded
    if (charge.status === StudentChargeStatus.REFUNDED) {
      throw StudentBillingErrors.alreadyRefunded();
    }

    // 3. Load charge with payments relationship
    const chargeWithPayments =
      await this.chargesRepo.findByIdWithPayments(chargeId);
    if (!chargeWithPayments) {
      throw StudentBillingErrors.refundValidationFailed(
        StudentChargeType.CLASS,
      );
    }

    // 4. Check if any payments exist
    if (
      !chargeWithPayments.payments ||
      chargeWithPayments.payments.length === 0
    ) {
      throw StudentBillingErrors.refundPaymentNotFound(chargeId);
    }

    // 5. Get the most recent payment (assuming we want to refund the latest one)
    const payment = chargeWithPayments.payments.sort(
      (a: Payment, b: Payment) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];

    // 5. Validate payment can be refunded
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw StudentBillingErrors.refundValidationFailed(charge.chargeType);
    }

    // 6. Validate refund eligibility based on type (attendance rules)
    await this.validateRefundEligibility(charge);

    // 7. Execute appropriate refund based on payment type
    await this.executeRefund(
      payment,
      charge,
      reason || 'Administrative refund',
    );

    // 8. Update charge and finalize
    return await this.finalizeRefund(charge, reason || 'Administrative refund');
  }

  private async validateMonthlyRefund(charge: StudentCharge): Promise<void> {
    const { studentUserProfileId, month, year, classId } = charge;

    // Use the classId directly from the charge (no need for strategy lookup)

    // If month/year are not set (legacy records), fall back to 30-day check
    if (!month || !year) {
      this.logger.warn(`Monthly charge missing month/year fields`, {
        chargeId: charge.id,
      });

      // Fallback: check last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const attendanceCount =
        await this.attendanceRepo.countAttendanceByStudentAndClass(
          studentUserProfileId,
          classId,
          thirtyDaysAgo,
        );

      if (attendanceCount > 0) {
        throw StudentBillingErrors.refundValidationFailed('monthly');
      }
      return;
    }

    // Proper validation: check attendance for the specific subscription month
    const startOfMonth = new Date(year, month - 1, 1); // month is 1-indexed (January = 0 in JS)

    const attendanceCount =
      await this.attendanceRepo.countAttendanceByStudentAndClass(
        studentUserProfileId,
        classId,
        startOfMonth, // Count attendance from start of subscription month
      );

    if (attendanceCount > 0) {
      throw StudentBillingErrors.refundValidationFailed('monthly');
    }
  }

  private async validateSessionRefund(charge: StudentCharge): Promise<void> {
    const { studentUserProfileId, sessionId } = charge;

    // Check if student attended this specific session
    const attendance = await this.attendanceRepo.findBySessionAndStudent(
      sessionId!,
      studentUserProfileId,
    );

    if (attendance) {
      throw StudentBillingErrors.refundValidationFailed('session');
    }
  }

  private async validateClassRefund(charge: StudentCharge): Promise<void> {
    const { studentUserProfileId, classId } = charge;

    // Check if student attended ANY session in this class
    const attendanceCount =
      await this.attendanceRepo.countAttendanceByStudentAndClass(
        studentUserProfileId,
        classId,
      );

    if (attendanceCount > 0) {
      throw StudentBillingErrors.refundValidationFailed('class');
    }
  }

  private async executeRefund(
    payment: Payment,
    charge: StudentCharge,
    reason: string,
  ): Promise<void> {
    // Check if payment is async (external) or sync (internal)
    if (PaymentService.isAsyncPayment(payment)) {
      await this.executeExternalRefund(payment, charge, reason);
    } else {
      await this.executeInternalRefund(payment, charge);
    }
  }

  private async executeInternalRefund(
    payment: Payment,
    charge: StudentCharge,
  ): Promise<void> {
    try {
      await this.paymentService.refundInternalPayment(payment.id);
    } catch (error) {
      throw StudentBillingErrors.refundFailed('Refund processing failed');
    }
  }

  private async executeExternalRefund(
    payment: Payment,
    charge: StudentCharge,
    reason: string,
  ): Promise<void> {
    try {
      await this.paymentService.refundPayment(
        payment.id,
        Money.from(charge.amount),
        reason,
      );
    } catch (error) {
      throw StudentBillingErrors.refundFailed('Refund processing failed');
    }
  }

  private async validateRefundEligibility(
    charge: StudentCharge,
  ): Promise<void> {
    switch (charge.chargeType) {
      case StudentChargeType.SUBSCRIPTION:
        return this.validateMonthlyRefund(charge);
      case StudentChargeType.SESSION:
        return this.validateSessionRefund(charge);
      case StudentChargeType.CLASS:
        return this.validateClassRefund(charge);
      default:
        throw StudentBillingErrors.refundValidationFailed(charge.chargeType);
    }
  }

  private async finalizeRefund(
    charge: StudentCharge,
    reason: string,
  ): Promise<StudentCharge> {
    charge.status = StudentChargeStatus.REFUNDED;
    charge.refundedAt = new Date();
    charge.refundReason = reason;

    const updatedCharge = await this.chargesRepo.saveCharge(charge);

    // Log successful refund
    this.logger.log(`Student charge refund completed`, {
      chargeId: charge.id,
      studentId: charge.studentUserProfileId,
      amount: charge.amount.toString(),
      type: charge.chargeType,
      reason,
    });

    return updatedCharge;
  }
}
