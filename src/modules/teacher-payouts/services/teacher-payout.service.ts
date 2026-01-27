import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
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
import { Payment } from '@/modules/finance/entities/payment.entity';
import {
  PayoutProgress,
  TeacherPayoutSummary,
  PayoutTypeSummary,
} from '../interfaces/payout-progress.interface';
import { PaymentReason } from '@/modules/finance/enums/payment-reason.enum';
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';
import { PaymentReferenceType } from '@/modules/finance/enums/payment-reference-type.enum';
import { WalletOwnerType } from '@/modules/finance/enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { Class } from '@/modules/classes/entities/class.entity';
import { TeacherPaymentStrategyDto } from '@/modules/classes/dto/teacher-payment-strategy.dto';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassAccessService } from '@/modules/classes/services/class-access.service';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { TeacherPayoutEvents } from '@/shared/events/teacher-payouts.events.enum';
import {
  TeacherPayoutCreatedEvent,
  TeacherPayoutPaidEvent,
  TeacherPayoutInstallmentPaidEvent,
  TeacherPayoutStatusUpdatedEvent,
} from '../events/teacher-payout.events';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { CentersService } from '@/modules/centers/services/centers.service';
import { BranchesService } from '@/modules/centers/services/branches.service';
import { UserProfileErrors } from '@/modules/user-profile/exceptions/user-profile.errors';
import { CentersErrors } from '@/modules/centers/exceptions/centers.errors';
import { ClassesRepository } from '@/modules/classes/repositories/classes.repository';

@Injectable()
export class TeacherPayoutService extends BaseService {
  private readonly logger = new Logger(TeacherPayoutService.name);

  constructor(
    private readonly payoutRepository: TeacherPayoutRecordsRepository,
    private readonly paymentService: PaymentService,
    private readonly branchAccessService: BranchAccessService,
    private readonly classAccessService: ClassAccessService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly centersService: CentersService,
    private readonly branchesService: BranchesService,
    private readonly classesRepository: ClassesRepository,
    private readonly userProfileService: UserProfileService,
  ) {
    super();
  }

  async getTeacherPayouts(
    dto: PaginateTeacherPayoutsDto,
    actor: ActorUser,
  ): Promise<Pagination<TeacherPayoutRecord>> {
    return this.payoutRepository.paginateTeacherPayouts(dto, actor);
  }

  async getPendingPayoutsForCenter(
    centerId: string,
  ): Promise<{ count: number; totalAmount: Money }> {
    return this.payoutRepository.getPendingPayoutsForCenter(centerId);
  }

  /**
   * Validate payout access for actor (branch and class access)
   * Extracted to eliminate duplication
   */
  private async validatePayoutAccessForActor(
    payout: TeacherPayoutRecord,
    actor: ActorUser,
  ): Promise<void> {
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: payout.branchId,
    });

    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: payout.classId,
    });
  }

  async getPayoutById(
    id: string,
    actor: ActorUser,
  ): Promise<TeacherPayoutRecord> {
    const payout =
      await this.payoutRepository.findTeacherPayoutForResponseOrThrow(id);

    // Validate access to the payout's branch and class
    await this.validatePayoutAccessForActor(payout, actor);

    return payout;
  }

  async createPayout(
    dto: CreatePayoutDto,
    actor: ActorUser,
  ): Promise<TeacherPayoutRecord> {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.payoutRepository.findByIdempotencyKey(
        dto.idempotencyKey,
      );
      if (existing) {
        return existing;
      }
    }

    // Create payout record
    const payout = await this.payoutRepository.createPayout({
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
      totalPaid: dto.totalPaid || Money.zero(), // Start with nothing paid
      lastPaymentAmount: dto.lastPaymentAmount, // Last payment amount
      idempotencyKey: dto.idempotencyKey,
    });

    // Emit payout created event
    await this.typeSafeEventEmitter.emitAsync(
      TeacherPayoutEvents.PAYOUT_CREATED,
      new TeacherPayoutCreatedEvent(actor, payout),
    );

    return payout;
  }

  // CLASS payout specific methods
  async createClassPayout(
    classEntity: Class,
    strategy: TeacherPaymentStrategyDto,
    actor: ActorUser,
    initialPaymentAmount?: number,
    paymentMethod?: PaymentMethod,
    idempotencyKey?: string,
  ): Promise<TeacherPayoutRecord> {
    // Validate teacher is active
    if (classEntity.teacherUserProfileId) {
      const teacher = await this.userProfileService.findOne(
        classEntity.teacherUserProfileId,
      );
      if (!teacher) {
        throw UserProfileErrors.userProfileNotFound();
      }
      if (!teacher.isActive) {
        throw UserProfileErrors.userProfileInactive();
      }
    }

    // Validate center is active
    const center = await this.centersService.findCenterById(
      classEntity.centerId,
      actor,
    );
    if (!center.isActive) {
      throw CentersErrors.centerInactive();
    }

    // Validate branch is active
    const branch = await this.branchesService.getBranch(
      classEntity.branchId,
      actor,
    );
    if (!branch.isActive) {
      throw CentersErrors.branchInactive();
    }

    const payout = await this.createPayout(
      {
        teacherUserProfileId: classEntity.teacherUserProfileId,
        unitType: TeacherPaymentUnit.CLASS,
        unitPrice: strategy.amount, // Total class amount
        unitCount: 1,
        classId: classEntity.id,
        branchId: classEntity.branchId,
        centerId: classEntity.centerId,
        totalPaid: Money.zero(), // Start with zero paid
        lastPaymentAmount: undefined, // No payments yet
        idempotencyKey,
      },
      actor,
    );

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
        actor,
      );
    }

    // Event already emitted by createPayout() method
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
      actor,
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
    actor: ActorUser,
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
      actor,
    );

    this.logger.log(
      `Payment executed successfully: ${payment.id}, amount: ${payment.amount}, method: ${paymentMethod}`,
    );

    // Update the actual payout record
    payout.totalPaid = payout.totalPaid.add(Money.from(paymentAmount));
    payout.lastPaymentAmount = Money.from(paymentAmount); // Last payment amount

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

    const savedPayout = await this.payoutRepository.savePayout(payout);

    // Emit installment paid event
    const remainingAmount = totalAmount.subtract(savedPayout.totalPaid);
    await this.typeSafeEventEmitter.emitAsync(
      TeacherPayoutEvents.INSTALLMENT_PAID,
      new TeacherPayoutInstallmentPaidEvent(
        actor,
        savedPayout,
        Money.from(paymentAmount),
        remainingAmount,
      ),
    );

    // Emit paid event if fully paid
    if (savedPayout.status === PayoutStatus.PAID) {
      await this.typeSafeEventEmitter.emitAsync(
        TeacherPayoutEvents.PAYOUT_PAID,
        new TeacherPayoutPaidEvent(actor, savedPayout, savedPayout.totalPaid),
      );
    }

    return savedPayout;
  }

  async updatePayoutStatus(
    id: string,
    dto: UpdatePayoutStatusDto,
    actor: ActorUser,
  ): Promise<TeacherPayoutRecord> {
    // Validate the payout exists
    const payout = await this.getPayoutById(id, actor);
    const oldStatus = payout.status;

    // Validate related entities are active
    if (payout.classId) {
      const classWithRelations =
        await this.classesRepository.findClassWithFullRelationsOrThrow(
          payout.classId,
        );
      if (classWithRelations.center && !classWithRelations.center.isActive) {
        throw CentersErrors.centerInactive();
      }
      if (classWithRelations.branch && !classWithRelations.branch.isActive) {
        throw CentersErrors.branchInactive();
      }
      if (classWithRelations.teacher && !classWithRelations.teacher.isActive) {
        throw UserProfileErrors.userProfileInactive();
      }
    }

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
        actor,
      );

      // Emit payout paid event
      await this.typeSafeEventEmitter.emitAsync(
        TeacherPayoutEvents.PAYOUT_PAID,
        new TeacherPayoutPaidEvent(
          actor,
          payout,
          Money.from((payout.unitPrice || 0) * payout.unitCount),
        ),
      );
    }

    // Update status only
    const updatedPayout = await this.payoutRepository.updateStatus(
      id,
      dto.status,
    );

    // Emit status updated event if status changed
    if (oldStatus !== dto.status) {
      await this.typeSafeEventEmitter.emitAsync(
        TeacherPayoutEvents.PAYOUT_STATUS_UPDATED,
        new TeacherPayoutStatusUpdatedEvent(
          actor,
          updatedPayout,
          oldStatus,
          dto.status,
        ),
      );
    }

    return updatedPayout;
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
    actor: ActorUser,
  ): Promise<Payment> {
    const request: ExecutePaymentRequest = {
      amount: new Money((payout.unitPrice || 0) * payout.unitCount),
      senderId: payout.branchId,
      senderType: WalletOwnerType.BRANCH,
      receiverId: payout.teacherUserProfileId,
      receiverType: WalletOwnerType.USER_PROFILE,
      reason: this.getPaymentReasonForTeacherPayout(payout.unitType),
      paymentMethod: paymentMethod,
      referenceType: PaymentReferenceType.TEACHER_PAYOUT,
      referenceId: payout.id,
    };

    const result = await this.paymentService.createAndExecutePayment(
      request,
      actor,
    );
    return result.payment;
  }

  /**
   * Get class payout progress
   * Extracted from controller for proper separation of concerns
   */
  async getClassPayoutProgress(
    classId: string,
  ): Promise<PayoutProgress | null> {
    const payout = await this.getClassPayout(classId);

    if (!payout) {
      return null;
    }

    const totalAmount = payout.unitPrice
      ? Money.from(payout.unitPrice)
      : Money.zero();
    const totalPaid = payout.totalPaid;
    const remaining = totalAmount.subtract(totalPaid);
    const progress = totalAmount.greaterThan(Money.zero())
      ? (totalPaid.toNumber() / totalAmount.toNumber()) * 100
      : 0;

    return {
      totalAmount: totalAmount.toNumber(),
      totalPaid: totalPaid.toNumber(),
      remaining: remaining.toNumber(),
      progress,
      lastPayment: payout.lastPaymentAmount?.toNumber(),
      payoutType: payout.unitType,
      payoutStatus: payout.status,
    };
  }

  /**
   * Get teacher progress summary
   * Extracted from controller for proper separation of concerns
   */
  async getTeacherProgressSummary(
    teacherId: string,
  ): Promise<TeacherPayoutSummary> {
    const payouts = await this.getTeacherPayoutsByTeacher(teacherId);

    const summary = {
      totalPayouts: payouts.length,
      totalAmount: Money.zero(),
      totalPaid: Money.zero(),
      totalRemaining: Money.zero(),
      overallProgress: 0,
      byType: {} as Record<
        string,
        {
          count: number;
          totalAmount: Money;
          totalPaid: Money;
          totalRemaining: Money;
          progress: number;
        }
      >,
    };

    for (const payout of payouts) {
      const totalAmount = payout.unitPrice
        ? Money.from(payout.unitPrice)
        : Money.zero();
      const totalPaid = payout.totalPaid;

      summary.totalAmount = summary.totalAmount.add(totalAmount);
      summary.totalPaid = summary.totalPaid.add(totalPaid);
      summary.totalRemaining = summary.totalRemaining.add(
        totalAmount.subtract(totalPaid).isNegative()
          ? Money.zero()
          : totalAmount.subtract(totalPaid),
      );

      // Group by payout type
      const type = payout.unitType;
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
    const response: TeacherPayoutSummary = {
      totalPayouts: summary.totalPayouts,
      totalAmount: summary.totalAmount.toNumber(),
      totalPaid: summary.totalPaid.toNumber(),
      totalRemaining: summary.totalRemaining.toNumber(),
      overallProgress: summary.overallProgress,
      byType: {} as Record<TeacherPaymentUnit, PayoutTypeSummary>,
    };

    // Calculate progress by type
    for (const type of Object.keys(summary.byType)) {
      const typeData = summary.byType[type];
      response.byType[type as TeacherPaymentUnit] = {
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

  async getTeacherPayoutsByTeacher(
    teacherUserProfileId: string,
  ): Promise<TeacherPayoutRecord[]> {
    return this.payoutRepository.findByTeacher(teacherUserProfileId);
  }
}
