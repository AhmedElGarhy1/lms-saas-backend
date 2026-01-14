import { Injectable, Logger } from '@nestjs/common';
import { TeacherPayoutRecordsRepository } from '../repositories/teacher-payout-records.repository';
import { TeacherPayoutRecord } from '../entities/teacher-payout-record.entity';
import { PaginateTeacherPayoutsDto } from '../dto/paginate-teacher-payouts.dto';
import { UpdatePayoutStatusDto } from '../dto/update-payout-status.dto';
import { CreatePayoutDto } from '../dto/create-payout.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { PayoutStatus } from '../enums/payout-status.enum';
import { BaseService } from '@/shared/common/services/base.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { TeacherPayoutErrors } from '../exceptions/teacher-payout.errors';
import {
  PaymentService,
  ExecutePaymentRequest,
} from '@/modules/finance/services/payment.service';
import { PaymentReason } from '@/modules/finance/enums/payment-reason.enum';
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';
import { WalletOwnerType } from '@/modules/finance/enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { Class } from '@/modules/classes/entities/class.entity';
import { TeacherPaymentStrategyDto } from '@/modules/classes/dto/teacher-payment-strategy.dto';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassAccessService } from '@/modules/classes/services/class-access.service';
import { SYSTEM_ACTOR } from '@/shared/common/constants/system-actor.constant';

@Injectable()
export class TeacherPayoutService extends BaseService {
  private readonly logger = new Logger(TeacherPayoutService.name);

  constructor(
    private readonly payoutRepository: TeacherPayoutRecordsRepository,
    private readonly paymentService: PaymentService,
    private readonly branchAccessService: BranchAccessService,
    private readonly classAccessService: ClassAccessService,
  ) {
    super();
  }

  async getTeacherPayouts(
    dto: PaginateTeacherPayoutsDto,
    actor: ActorUser,
  ): Promise<Pagination<TeacherPayoutRecord>> {
    return this.payoutRepository.paginateTeacherPayouts(dto, actor);
  }

  async getPayoutById(
    id: string,
    actor: ActorUser,
  ): Promise<TeacherPayoutRecord> {
    const payout = await this.payoutRepository.findById(id);
    if (!payout) {
      throw TeacherPayoutErrors.payoutNotFound();
    }

    // Validate access to the payout's branch and class
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: payout.branchId,
    });

    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: payout.classId,
    });

    return payout;
  }

  async createPayout(dto: CreatePayoutDto): Promise<TeacherPayoutRecord> {
    // Create payout record
    return this.payoutRepository.createPayout({
      teacherUserProfileId: dto.teacherUserProfileId,
      unitType: dto.unitType,
      unitPrice: dto.unitPrice,
      unitCount: dto.unitCount,
      classId: dto.classId,
      sessionId: dto.sessionId,
      month: dto.month,
      year: dto.year,
      branchId: dto.branchId,
      centerId: dto.centerId,
      status:
        dto.unitType === TeacherPaymentUnit.CLASS
          ? PayoutStatus.INSTALLMENT
          : PayoutStatus.PENDING,
      paymentMethod: undefined, // Will be set when paying
      totalPaid: dto.totalPaid || Money.zero(), // Start with nothing paid
      lastPaymentAmount: dto.lastPaymentAmount, // Last payment amount
    });
  }

  // CLASS payout specific methods
  async createClassPayout(
    classEntity: Class,
    strategy: TeacherPaymentStrategyDto,
    initialPaymentAmount?: number,
    paymentMethod?: PaymentMethod,
  ): Promise<TeacherPayoutRecord> {
    const payout = await this.createPayout({
      teacherUserProfileId: classEntity.teacherUserProfileId,
      unitType: TeacherPaymentUnit.CLASS,
      unitPrice: strategy.amount, // Total class amount
      unitCount: 1,
      classId: classEntity.id,
      branchId: classEntity.branchId,
      centerId: classEntity.centerId,
      totalPaid: Money.zero(), // Start with zero paid
      lastPaymentAmount: undefined, // No payments yet
    });

    // If initial payment amount is specified, pay the first installment
    this.logger.log(
      `Creating CLASS payout for class ${classEntity.id}, initialPaymentAmount: ${initialPaymentAmount}`,
    );
    if (initialPaymentAmount && initialPaymentAmount > 0) {
      this.logger.log(
        `Executing initial payment of ${initialPaymentAmount} for class ${classEntity.id}`,
      );

      // Execute payment using specified method (default to WALLET)
      const paymentMethodToUse = paymentMethod || PaymentMethod.WALLET;
      await this.executeInstallmentPayment(
        payout,
        initialPaymentAmount,
        paymentMethodToUse,
      );
    }

    return payout;
  }

  async getClassPayout(
    classId: string,
    teacherUserProfileId?: string,
  ): Promise<TeacherPayoutRecord | null> {
    return this.payoutRepository.getClassPayout(classId, teacherUserProfileId);
  }

  async payClassInstallment(
    payoutId: string,
    installmentAmount: number,
    paymentMethod: PaymentMethod,
    actor: ActorUser,
  ): Promise<TeacherPayoutRecord> {
    const payout = await this.getPayoutById(payoutId, actor);

    // Validate it's a CLASS payout
    if (payout.unitType !== TeacherPaymentUnit.CLASS) {
      throw TeacherPayoutErrors.invalidPayoutType();
    }

    // Validate installment amount
    const payoutTotalAmount = payout.unitPrice
      ? Money.from(payout.unitPrice)
      : Money.zero();
    const remaining = payoutTotalAmount.subtract(payout.totalPaid);
    if (Money.from(installmentAmount).greaterThan(remaining)) {
      throw TeacherPayoutErrors.payoutAmountExceedsRemaining();
    }

    if (Money.from(installmentAmount).lessThanOrEqual(Money.zero())) {
      throw TeacherPayoutErrors.invalidPayoutAmount();
    }

    // Execute the installment payment
    return this.executeInstallmentPayment(
      payout,
      installmentAmount,
      paymentMethod,
    );
  }

  /**
   * Execute installment payment for CLASS payouts
   * Updates payout record and handles status transitions
   */
  private async executeInstallmentPayment(
    payout: TeacherPayoutRecord,
    paymentAmount: number,
    paymentMethod: PaymentMethod,
  ): Promise<TeacherPayoutRecord> {
    // Create a temporary payout record for payment (needed by existing flow)
    const tempPayoutForPayment = {
      ...payout,
      unitPrice: paymentAmount, // Use the payment amount for calculation
      unitCount: 1,
    } as TeacherPayoutRecord;

    // Execute payment
    const payment = await this.executePaymentTransaction(
      tempPayoutForPayment,
      paymentMethod,
    );

    this.logger.log(
      `Payment executed successfully: ${payment.id}, amount: ${payment.amount}, method: ${paymentMethod}`,
    );

    // Update the actual payout record
    payout.totalPaid = payout.totalPaid.add(Money.from(paymentAmount));
    payout.lastPaymentAmount = Money.from(paymentAmount); // Last payment amount
    payout.paymentId = payment.id;
    payout.paymentMethod = paymentMethod;

    // Check if fully paid
    const totalAmount = payout.unitPrice
      ? Money.from(payout.unitPrice)
      : Money.zero();
    payout.status = payout.totalPaid.greaterThanOrEqual(totalAmount)
      ? PayoutStatus.PAID
      : PayoutStatus.INSTALLMENT;

    this.logger.log(
      `Updated payout record: totalPaid=${payout.totalPaid}, lastPaymentAmount=${payout.lastPaymentAmount}, status=${payout.status}`,
    );

    return this.payoutRepository.savePayout(payout);
  }

  async updatePayoutStatus(
    id: string,
    dto: UpdatePayoutStatusDto,
    actor: ActorUser,
  ): Promise<TeacherPayoutRecord> {
    // Validate the payout exists
    const payout = await this.getPayoutById(id, actor);

    // Validate status transition
    this.validateStatusTransition(payout.status, dto.status);

    // Execute payment when moving to PAID
    if (dto.status === PayoutStatus.PAID) {
      if (!dto.paymentMethod) {
        throw TeacherPayoutErrors.payoutInvalidStatusTransition();
      }

      // Execute the actual payment transaction
      const payment = await this.executePaymentTransaction(
        payout,
        dto.paymentMethod,
      );

      // Store the payment ID in the payout record
      dto.paymentId = payment.id;
    }

    // Update status, payment source, and payment ID
    return this.payoutRepository.updateStatus(
      id,
      dto.status,
      dto.paymentId,
      dto.paymentMethod,
    );
  }

  private validateStatusTransition(
    currentStatus: PayoutStatus,
    newStatus: PayoutStatus,
  ): void {
    const validTransitions: Record<PayoutStatus, PayoutStatus[]> = {
      [PayoutStatus.PENDING]: [PayoutStatus.PAID], // SESSION/HOUR: PENDING → PAID
      [PayoutStatus.INSTALLMENT]: [PayoutStatus.PAID], // CLASS: INSTALLMENT → PAID
      [PayoutStatus.PAID]: [], // Terminal state
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw TeacherPayoutErrors.payoutInvalidStatusTransition();
    }
  }

  private getPaymentReasonForTeacherPayout(
    unitType: TeacherPaymentUnit,
  ): PaymentReason {
    switch (unitType) {
      case TeacherPaymentUnit.STUDENT:
        return PaymentReason.TEACHER_STUDENT_PAYOUT;
      case TeacherPaymentUnit.HOUR:
        return PaymentReason.TEACHER_HOUR_PAYOUT;
      case TeacherPaymentUnit.SESSION:
        return PaymentReason.TEACHER_SESSION_PAYOUT;
      case TeacherPaymentUnit.MONTH:
        return PaymentReason.TEACHER_MONTHLY_PAYOUT;
      case TeacherPaymentUnit.CLASS:
        return PaymentReason.TEACHER_CLASS_PAYOUT;
      default:
        return PaymentReason.TEACHER_SESSION_PAYOUT; // fallback
    }
  }

  /**
   * Execute the actual payment transaction when payout status changes to PAID
   */
  private async executePaymentTransaction(
    payout: TeacherPayoutRecord,
    paymentMethod: PaymentMethod,
  ) {
    const request: ExecutePaymentRequest = {
      amount: new Money((payout.unitPrice || 0) * payout.unitCount),
      senderId: payout.branchId,
      senderType: WalletOwnerType.BRANCH,
      receiverId: payout.teacherUserProfileId,
      receiverType: WalletOwnerType.USER_PROFILE,
      reason: this.getPaymentReasonForTeacherPayout(payout.unitType),
      paymentMethod: paymentMethod,
      correlationId: payout.id,
    };

    const result = await this.paymentService.createAndExecutePayment(
      request,
      SYSTEM_ACTOR,
    );
    return result.payment;
  }

  // Helper methods for future use
  async getPendingPayouts(): Promise<TeacherPayoutRecord[]> {
    return this.payoutRepository.findPendingPayouts();
  }

  async getTeacherPayoutsByTeacher(
    teacherUserProfileId: string,
  ): Promise<TeacherPayoutRecord[]> {
    return this.payoutRepository.findByTeacher(teacherUserProfileId);
  }
}
