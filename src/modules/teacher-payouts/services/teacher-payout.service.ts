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

@Injectable()
export class TeacherPayoutService extends BaseService {
  constructor(
    private readonly payoutRepository: TeacherPayoutRecordsRepository,
    private readonly paymentService: PaymentService,
  ) {
    super();
  }

  async getTeacherPayouts(
    dto: PaginateTeacherPayoutsDto,
    actor: ActorUser,
  ): Promise<Pagination<TeacherPayoutRecord>> {
    return this.payoutRepository.paginateTeacherPayouts(dto, actor);
  }

  async getPayoutById(id: string): Promise<TeacherPayoutRecord> {
    const payout = await this.payoutRepository.findById(id);
    if (!payout) {
      throw TeacherPayoutErrors.payoutNotFound();
    }
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
  ): Promise<TeacherPayoutRecord> {
    // Validate the payout exists
    const payout = await this.getPayoutById(id);

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
      [PayoutStatus.PENDING]: [PayoutStatus.PAID, PayoutStatus.REJECTED],
      [PayoutStatus.PAID]: [], // Terminal state
      [PayoutStatus.REJECTED]: [], // Terminal state
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw TeacherPayoutErrors.payoutInvalidStatusTransition();
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
      reason: PaymentReason.TEACHER_PAYOUT,
      source: paymentSource,
      correlationId: payout.id,
    };

    const result = await this.paymentService.createAndExecutePayment(request);
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
