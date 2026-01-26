import { Injectable } from '@nestjs/common';
import { StudentCharge } from '../entities/student-charge.entity';
import { StudentChargeType, StudentChargeStatus } from '../enums';
import { StudentChargesRepository } from '../repositories/student-charges.repository';
import { PaymentStrategyService } from '@/modules/classes/services/payment-strategy.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassAccessService } from '@/modules/classes/services/class-access.service';
import { ClassesService } from '@/modules/classes/services/classes.service';
import { Money } from '@/shared/common/utils/money.util';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { StudentBillingErrors } from '../exceptions/student-billing.errors';
import { DateHelpers } from '../utils/date-helpers.util';

export interface StudentBillingSummary {
  totalCharges: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  overallProgress: number;
  byType: Record<StudentChargeType, ChargeTypeSummary>;
}

export interface ChargeTypeSummary {
  count: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  progress: number;
}

@Injectable()
export class StudentBillingQueryService {
  constructor(
    private readonly chargesRepository: StudentChargesRepository,
    private readonly paymentStrategyService: PaymentStrategyService,
    private readonly classesService: ClassesService,
    private readonly branchAccessService: BranchAccessService,
    private readonly classAccessService: ClassAccessService,
  ) {}

  /**
   * Validate class access for actor (branch and class access)
   * Extracted to eliminate duplication
   */
  private async validateClassAccessForActor(
    classId: string,
    actor: ActorUser,
  ): Promise<void> {
    const classEntity = await this.classesService.findOneOrThrow(classId);

    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: classEntity.branchId,
    });

    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId,
    });
  }

  /**
   * Get class charge progress for a student
   */
  async getClassChargeProgress(
    studentUserProfileId: string,
    classId: string,
    actor: ActorUser,
  ): Promise<{
    totalAmount: number;
    totalPaid: number;
    remaining: number;
    progress: number;
    lastPayment?: number;
    payoutType: StudentChargeType;
    payoutStatus: StudentChargeStatus;
  }> {
    // ✅ VALIDATE: Access control for staff users
    await this.validateClassAccessForActor(classId, actor);

    // Find active class charge (COMPLETED or INSTALLMENT)
    const classCharge =
      await this.chargesRepository.findActiveClassChargeByStudentAndClass(
        studentUserProfileId,
        classId,
      );

    if (!classCharge) {
      throw StudentBillingErrors.classChargeNotFound();
    }

    const totalAmount = Money.from(classCharge.amount);
    const totalPaid = Money.from(classCharge.totalPaid);
    const remaining = totalAmount.subtract(totalPaid);
    const progress = totalPaid
      .divide(totalAmount.toNumber())
      .multiply(100)
      .toNumber();

    return {
      totalAmount: totalAmount.toNumber(),
      totalPaid: totalPaid.toNumber(),
      remaining: remaining.toNumber(),
      progress: Math.round(progress * 100) / 100, // Round to 2 decimal places
      lastPayment: classCharge.lastPaymentAmount, // Match teacher format
      payoutType: classCharge.chargeType, // Match teacher format
      payoutStatus: classCharge.status, // Match teacher format
    };
  }

  /**
   * Get student billing summary for all charges
   */
  async getStudentBillingSummary(
    studentUserProfileId: string,
    actor: ActorUser,
  ): Promise<StudentBillingSummary> {
    // Get all active charges for the student
    const charges =
      await this.chargesRepository.findActiveChargesByStudent(
        studentUserProfileId,
      );

    const summary = {
      totalCharges: charges.length,
      totalAmount: Money.zero(),
      totalPaid: Money.zero(),
      totalRemaining: Money.zero(),
      overallProgress: 0,
      byType: {} as Record<string, {
        count: number;
        totalAmount: Money;
        totalPaid: Money;
        totalRemaining: Money;
        progress: number;
      }>,
    };

    for (const charge of charges) {
      const totalAmount = Money.from(charge.amount);
      const totalPaid = Money.from(charge.totalPaid);

      summary.totalAmount = summary.totalAmount.add(totalAmount);
      summary.totalPaid = summary.totalPaid.add(totalPaid);
      summary.totalRemaining = summary.totalRemaining.add(
        totalAmount.subtract(totalPaid).isNegative()
          ? Money.zero()
          : totalAmount.subtract(totalPaid),
      );

      // Group by charge type
      const type = charge.chargeType;
      if (!summary.byType[type]) {
        summary.byType[type] = {
          count: 0,
          totalAmount: Money.zero(),
          totalPaid: Money.zero(),
          totalRemaining: Money.zero(),
          progress: 0,
        };
      }

      summary.byType[type].count += 1;
      summary.byType[type].totalAmount =
        summary.byType[type].totalAmount.add(totalAmount);
      summary.byType[type].totalPaid =
        summary.byType[type].totalPaid.add(totalPaid);
      summary.byType[type].totalRemaining = summary.byType[
        type
      ].totalRemaining.add(
        totalAmount.subtract(totalPaid).isNegative()
          ? Money.zero()
          : totalAmount.subtract(totalPaid),
      );
    }

    // Calculate overall progress
    summary.overallProgress = summary.totalAmount.greaterThan(Money.zero())
      ? (summary.totalPaid.toNumber() / summary.totalAmount.toNumber()) * 100
      : 0;

    // Convert Money objects to numbers for response
    const response: StudentBillingSummary = {
      totalCharges: summary.totalCharges,
      totalAmount: summary.totalAmount.toNumber(),
      totalPaid: summary.totalPaid.toNumber(),
      totalRemaining: summary.totalRemaining.toNumber(),
      overallProgress: summary.overallProgress,
      byType: {} as Record<StudentChargeType, ChargeTypeSummary>,
    };

    // Calculate progress by type
    for (const type of Object.keys(summary.byType)) {
      const typeData = summary.byType[type];
      response.byType[type as StudentChargeType] = {
        count: typeData.count,
        totalAmount: typeData.totalAmount.toNumber(),
        totalPaid: typeData.totalPaid.toNumber(),
        totalRemaining: typeData.totalRemaining.toNumber(),
        progress:
          typeData.totalAmount.toNumber() > 0
            ? (typeData.totalPaid.toNumber() /
                typeData.totalAmount.toNumber()) *
              100
            : 0,
      };
    }

    return response;
  }

  /**
   * Get active monthly subscription for a student in a class
   */
  async getActiveSubscription(
    studentUserProfileId: string,
    classId: string,
  ): Promise<StudentCharge | null> {
    const { month: currentMonth, year: currentYear } =
      DateHelpers.getCurrentMonthYear();

    return this.chargesRepository.findActiveMonthlySubscription(
      studentUserProfileId,
      classId,
      currentMonth,
      currentYear,
    );
  }

  /**
   * Check if student has paid for session access under a strategy
   */
  async hasPaidForSessionAccess(
    studentUserProfileId: string,
    sessionId: string,
  ): Promise<boolean> {
    const charge =
      await this.chargesRepository.findSessionChargeByStudentAndSession(
        studentUserProfileId,
        sessionId,
      );
    return !!charge;
  }

  /**
   * Check if a student is allowed to attend a class/session
   * This is the core method called by SessionsService.checkIn()
   */
  async checkStudentAccess(
    studentUserProfileId: string,
    classId: string,
    sessionId?: string,
  ): Promise<boolean> {
    // Check if class charges are enabled for this class
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (paymentStrategy?.includeMonth) {
      // First check if student has active monthly subscription for this class
      const { month: currentMonth, year: currentYear } =
        DateHelpers.getCurrentMonthYear();

      const activeSubscription =
        await this.chargesRepository.findActiveMonthlySubscription(
          studentUserProfileId,
          classId,
          currentMonth,
          currentYear,
        );
      if (activeSubscription) {
        return true;
      }
    }

    if (paymentStrategy?.includeClass) {
      // Class charges are enabled - check if student has active class charge
      const classCharge =
        await this.chargesRepository.findActiveClassChargeByStudentAndClass(
          studentUserProfileId,
          classId,
        );
      if (classCharge) {
        return true;
      }
    }

    // Check if they paid for session access
    if (paymentStrategy?.includeSession && sessionId) {
      const sessionCharge =
        await this.chargesRepository.findSessionChargeByStudentAndSession(
          studentUserProfileId,
          sessionId,
        );
      if (sessionCharge) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get payment strategy for a class (used by attendance module for detailed error messages)
   */
  async getClassPaymentStrategy(classId: string) {
    return this.paymentStrategyService.getStudentPaymentStrategyForClass(
      classId,
    );
  }
}
