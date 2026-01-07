import { Injectable } from '@nestjs/common';
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
import { PaymentSource as FinancePaymentSource } from '@/modules/finance/enums/payment-source.enum';
import { WalletOwnerType } from '@/modules/finance/enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassAccessService } from '@/modules/classes/services/class-access.service';
import { SYSTEM_ACTOR } from '@/shared/common/constants/system-actor.constant';

@Injectable()
export class TeacherPayoutService extends BaseService {
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
      status: PayoutStatus.PENDING,
      paymentSource: undefined, // Will be set when paying
    });
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
      if (!dto.paymentSource) {
        throw TeacherPayoutErrors.payoutInvalidStatusTransition();
      }

      // Execute the actual payment transaction
      const payment = await this.executePaymentTransaction(
        payout,
        dto.paymentSource,
      );

      // Store the payment ID in the payout record
      dto.paymentId = payment.id;
    }

    // Update status, payment source, and payment ID
    return this.payoutRepository.updateStatus(
      id,
      dto.status,
      dto.paymentId,
      dto.paymentSource,
    );
  }

  private validateStatusTransition(
    currentStatus: PayoutStatus,
    newStatus: PayoutStatus,
  ): void {
    const validTransitions: Record<PayoutStatus, PayoutStatus[]> = {
      [PayoutStatus.PENDING]: [PayoutStatus.PAID],
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
    paymentSource: FinancePaymentSource,
  ) {
    const request: ExecutePaymentRequest = {
      amount: new Money(payout.unitPrice * payout.unitCount),
      senderId: payout.branchId,
      senderType: WalletOwnerType.BRANCH,
      receiverId: payout.teacherUserProfileId,
      receiverType: WalletOwnerType.USER_PROFILE,
      reason: this.getPaymentReasonForTeacherPayout(payout.unitType),
      source: paymentSource,
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
