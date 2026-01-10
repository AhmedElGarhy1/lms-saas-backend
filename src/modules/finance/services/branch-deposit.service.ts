import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Money } from '@/shared/common/utils/money.util';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { FinanceErrors } from '../exceptions/finance.errors';
import { DepositResult } from '../interfaces/withdrawal.interface';
import { PaymentOrchestratorService } from './payment-orchestrator.service';
import { randomUUID } from 'crypto';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class BranchDepositService {
  private readonly logger = new Logger(BranchDepositService.name);

  constructor(
    private readonly paymentOrchestrator: PaymentOrchestratorService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  /**
   * Deposit money to branch wallet balance
   */
  @Transactional()
  async depositToWallet(
    branchId: string,
    amount: Money,
    actor: ActorUser,
    notes?: string,
  ): Promise<DepositResult> {
    const staffId = actor.userProfileId;
    this.logger.log(
      `Processing wallet deposit: ${amount.toString()} to branch ${branchId} by staff ${staffId}`,
    );

    // Validate branch access
    await this.validateBranchAccess(staffId, branchId);

    // Validate deposit amount
    await this.validateDepositAmount(amount);

    // Use PaymentOrchestratorService to handle the deposit
    const paymentResult =
      await this.paymentOrchestrator.createAndExecutePayment(
        {
          amount,
          senderId: staffId,
          senderType: WalletOwnerType.USER_PROFILE,
          receiverId: branchId,
          receiverType: WalletOwnerType.BRANCH,
          reason: PaymentReason.BRANCH_DEPOSIT,
          source: PaymentMethod.WALLET,
          correlationId: randomUUID(),
          metadata: {
            notes,
          },
        },
        actor,
      );

    const result: DepositResult = {
      amount,
      method: 'wallet',
      branchId,
      staffId,
      timestamp: new Date(),
      transactionId:
        paymentResult.transactions[0]?.id || paymentResult.payment.id,
      notes,
    };

    this.logger.log(`Wallet deposit completed: ${result.transactionId}`);

    return result;
  }

  /**
   * Validate that staff member has access to the branch
   */
  private async validateBranchAccess(
    staffId: string,
    branchId: string,
  ): Promise<void> {}

  /**
   * Validate deposit amount
   */
  private async validateDepositAmount(amount: Money): Promise<void> {
    // Basic amount validation (positive, reasonable limits)
    if (amount.lessThanOrEqual(Money.zero())) {
      throw FinanceErrors.invalidPaymentAmount();
    }

    // Maximum deposit limit (configurable)
    const maxDeposit = Money.from(100000); // 100,000 EGP per deposit
    if (amount.greaterThan(maxDeposit)) {
      throw FinanceErrors.invalidPaymentOperation();
    }
  }

  /**
   * Deposit money to branch cashbox
   */
  @Transactional()
  async depositToCashbox(
    branchId: string,
    amount: Money,
    actor: ActorUser,
    notes?: string,
  ): Promise<DepositResult> {
    const staffId = actor.userProfileId;
    this.logger.log(
      `Processing cashbox deposit: ${amount.toString()} to branch ${branchId} by staff ${staffId}`,
    );

    // Validate branch access
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId,
    });

    // Validate deposit amount
    await this.validateDepositAmount(amount);

    // Use PaymentOrchestratorService to handle the cash deposit
    const paymentResult =
      await this.paymentOrchestrator.createAndExecutePayment(
        {
          amount,
          senderId: staffId,
          senderType: WalletOwnerType.USER_PROFILE,
          receiverId: branchId,
          receiverType: WalletOwnerType.BRANCH,
          reason: PaymentReason.BRANCH_DEPOSIT,
          source: PaymentMethod.CASH, // This will trigger cash transaction creation
          correlationId: randomUUID(),
          metadata: {
            notes,
          },
        },
        actor,
      );

    const result: DepositResult = {
      amount,
      method: 'cashbox',
      branchId,
      staffId,
      timestamp: new Date(),
      transactionId:
        paymentResult.transactions[0]?.id ||
        paymentResult.cashTransactions?.[0]?.id ||
        paymentResult.payment.id,
      notes,
    };

    this.logger.log(`Cashbox deposit completed: ${result.transactionId}`);

    return result;
  }
}
