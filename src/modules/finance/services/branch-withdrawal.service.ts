import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Money } from '@/shared/common/utils/money.util';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { FinanceErrors } from '../exceptions/finance.errors';
import { WithdrawalResult } from '../interfaces/withdrawal.interface';
import { PaymentOrchestratorService } from './payment-orchestrator.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { randomUUID } from 'crypto';

@Injectable()
export class BranchWithdrawalService {
  private readonly logger = new Logger(BranchWithdrawalService.name);

  constructor(
    private readonly paymentOrchestrator: PaymentOrchestratorService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  /**
   * Withdraw money from branch wallet balance
   */
  @Transactional()
  async withdrawFromWallet(
    branchId: string,
    amount: Money,
    actor: ActorUser,
    notes?: string,
  ): Promise<WithdrawalResult> {
    const staffId = actor.userProfileId;

    this.logger.log(
      `Processing wallet withdrawal: ${amount.toString()} from branch ${branchId} by staff ${staffId}`,
    );

    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId,
    });

    // Use PaymentOrchestratorService to handle the withdrawal
    const paymentResult =
      await this.paymentOrchestrator.createAndExecutePayment(
        {
          amount,
          senderId: branchId,
          senderType: WalletOwnerType.BRANCH,
          receiverId: staffId,
          receiverType: WalletOwnerType.USER_PROFILE,
          reason: PaymentReason.BRANCH_WITHDRAWAL,
          paymentMethod: PaymentMethod.WALLET,
          correlationId: randomUUID(),
          metadata: {
            notes,
          },
        },
        actor,
      );

    // Generate withdrawal ID
    const withdrawalId = `withdraw_wallet_${paymentResult.payment.id}`;

    const result: WithdrawalResult = {
      amount,
      method: 'wallet',
      branchId,
      staffId,
      timestamp: new Date(),
      transactionId:
        paymentResult.transactions[0]?.id || paymentResult.payment.id,
      notes,
    };

    this.logger.log(`Wallet withdrawal completed: ${withdrawalId}`);

    return result;
  }

  /**
   * Withdraw money from branch cashbox
   */
  @Transactional()
  async withdrawFromCashbox(
    branchId: string,
    amount: Money,
    actor: ActorUser,
    notes?: string,
  ): Promise<WithdrawalResult> {
    const staffId = actor.userProfileId;
    this.logger.log(
      `Processing cashbox withdrawal: ${amount.toString()} from branch ${branchId} by staff ${staffId}`,
    );

    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId,
    });

    // Use PaymentOrchestratorService to handle the cash withdrawal
    const paymentResult =
      await this.paymentOrchestrator.createAndExecutePayment(
        {
          amount,
          senderId: branchId,
          senderType: WalletOwnerType.BRANCH,
          receiverId: staffId,
          receiverType: WalletOwnerType.USER_PROFILE,
          reason: PaymentReason.BRANCH_WITHDRAWAL,
          paymentMethod: PaymentMethod.CASH, // This will trigger cash transaction creation
          correlationId: randomUUID(),
          metadata: {
            notes,
          },
        },
        actor,
      );

    const result: WithdrawalResult = {
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

    this.logger.log(`Cashbox withdrawal completed`);

    return result;
  }
}
