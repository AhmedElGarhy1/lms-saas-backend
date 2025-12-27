import { Injectable, Logger } from '@nestjs/common';
import { WalletRepository } from '../repositories/wallet.repository';
import { Wallet } from '../entities/wallet.entity';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { BaseService } from '@/shared/common/services/base.service';
import {
  InsufficientFundsException,
  InsufficientPermissionsException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';
import { Transactional } from '@nestjs-cls/transactional';
import { QueryFailedError } from 'typeorm';
import {
  TransactionRepository,
  TransactionStatement,
} from '../repositories/transaction.repository';
import { RequestContext } from '@/shared/common/context/request.context';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { PaginateTransactionDto } from '../dto/paginate-transaction.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { UserProfileRepository } from '@/modules/user-profile/repositories/user-profile.repository';
import { TransactionType } from '../enums/transaction-type.enum';
import { randomUUID } from 'crypto';
import { TransactionService } from './transaction.service';
import { FinanceMonitorService } from '../monitoring/finance-monitor.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { FinanceActivityType } from '../enums/finance-activity-type.enum';

const MAX_RETRIES = 3;

@Injectable()
export class WalletService extends BaseService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userProfileRepository: UserProfileRepository,
    private readonly transactionService: TransactionService,
    private readonly financeMonitorService: FinanceMonitorService,
    private readonly activityLogService: ActivityLogService,
  ) {
    super();
  }

  /**
   * Get or create wallet for owner
   */
  @Transactional()
  async getWallet(
    ownerId: string,
    ownerType: WalletOwnerType,
  ): Promise<Wallet> {
    let wallet = await this.walletRepository.findByOwner(ownerId, ownerType);

    if (!wallet) {
      wallet = await this.walletRepository.create({
        ownerId,
        ownerType,
        balance: Money.zero(),
        bonusBalance: Money.zero(),
        lockedBalance: Money.zero(),
      });
    }

    return wallet;
  }

  /**
   * Update wallet balance with pessimistic locking and retry mechanism
   *
   * @param walletId - The wallet ID to update
   * @param amount - Positive for credit, negative for debit
   * @param retryCount - Internal retry counter (max 3 retries)
   *
   * @throws InsufficientFundsException - If resulting balance would be negative
   * @throws QueryFailedError - If lock timeout occurs after all retries
   *
   * @example
   * // Credit $50.00 to wallet
   * await walletService.updateBalance(walletId, Money.from(50.00));
   *
   * // Debit $25.00 from wallet
   * await walletService.updateBalance(walletId, Money.from(-25.00));
   */
  @Transactional()
  async updateBalance(
    walletId: string,
    amount: Money,
    retryCount = 0,
  ): Promise<Wallet> {
    try {
      // Acquire pessimistic write lock on wallet row
      const lockedWallet =
        await this.walletRepository.findOneWithLock(walletId);

      // Pre-check: Prevent negative balance (before save to avoid DB constraint violation)
      const newBalance = lockedWallet.balance.add(amount);
      if (newBalance.isNegative()) {
        throw new InsufficientFundsException('t.messages.businessLogicError', {
          message: 'Insufficient balance',
        } as never);
      }

      // Perform balance update using Money utility with currency precision
      lockedWallet.balance = newBalance.toCurrencyPrecision();

      // Save within transaction (automatically committed by @Transactional)
      const savedWallet = await this.walletRepository.saveWallet(lockedWallet);

      // Audit log the balance change
      try {
        const balanceChange = amount.toNumber();
        const activityType =
          balanceChange > 0
            ? FinanceActivityType.WALLET_CREDITED
            : FinanceActivityType.WALLET_DEBITED;

        await this.activityLogService.log(
          activityType,
          {
            walletId: walletId,
            amount: Math.abs(balanceChange),
            previousBalance: lockedWallet.balance.subtract(amount).toString(),
            newBalance: savedWallet.balance.toString(),
            ownerId: lockedWallet.ownerId,
            ownerType: lockedWallet.ownerType,
          },
          lockedWallet.ownerId, // targetUserId
        );
      } catch (logError) {
        // Log audit failure but don't fail the transaction
        this.logger.warn('Failed to log wallet balance change activity', {
          walletId,
          amount: amount.toString(),
          error: logError.message,
        });
      }

      return savedWallet;
    } catch (error) {
      // Retry on lock timeout (PostgreSQL error code 40001 or 40P01)
      if (
        error instanceof QueryFailedError &&
        (error.driverError?.code === '40001' ||
          error.driverError?.code === '40P01') &&
        retryCount < MAX_RETRIES
      ) {
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, retryCount)),
        );
        this.logger.warn(
          `Lock timeout on wallet ${walletId}, retrying (${retryCount + 1}/${MAX_RETRIES})`,
        );
        return this.updateBalance(walletId, amount, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Update locked balance (for escrow logic)
   *
   * @param walletId - The wallet ID to update
   * @param amount - Positive to lock funds, negative to unlock funds
   * @param retryCount - Internal retry counter (max 3 retries)
   *
   * @throws InsufficientFundsException - If locked balance would be negative
   *
   * @example
   * // Lock $100.00 in escrow for pending payment
   * await walletService.updateLockedBalance(walletId, Money.from(100.00));
   *
   * // Unlock $50.00 from escrow (partial release)
   * await walletService.updateLockedBalance(walletId, Money.from(-50.00));
   */
  @Transactional()
  async updateLockedBalance(
    walletId: string,
    amount: Money,
    retryCount = 0,
  ): Promise<Wallet> {
    try {
      // Acquire pessimistic write lock on wallet row
      const wallet = await this.walletRepository.findOneWithLock(walletId);

      // Pre-check: Prevent negative locked balance
      const newLockedBalance = wallet.lockedBalance.add(amount);
      if (newLockedBalance.isNegative()) {
        throw new InsufficientFundsException('t.messages.businessLogicError', {
          message: 'Insufficient locked balance',
        } as never);
      }

      wallet.lockedBalance = newLockedBalance;

      return await this.walletRepository.saveWallet(wallet);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError?.code === '40001' ||
          error.driverError?.code === '40P01') &&
        retryCount < MAX_RETRIES
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, retryCount)),
        );
        this.logger.warn(
          `Lock timeout on wallet ${walletId}, retrying (${retryCount + 1}/${MAX_RETRIES})`,
        );
        return this.updateLockedBalance(walletId, amount, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Update both balance and lockedBalance atomically (for payment cancellation)
   * Moves amount from lockedBalance back to balance
   */
  @Transactional()
  async moveFromLockedToBalance(
    walletId: string,
    amount: Money,
  ): Promise<Wallet> {
    try {
      const wallet = await this.walletRepository.findOneWithLock(walletId);

      // Pre-check: Ensure lockedBalance has enough
      if (wallet.lockedBalance.lessThan(amount)) {
        throw new InsufficientFundsException('t.messages.businessLogicError', {
          message: 'Insufficient locked balance',
        } as never);
      }

      // Move amount from lockedBalance to balance with currency precision
      wallet.lockedBalance = wallet.lockedBalance
        .subtract(amount)
        .toCurrencyPrecision();
      wallet.balance = wallet.balance.add(amount).toCurrencyPrecision();

      return await this.walletRepository.saveWallet(wallet);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError?.code === '40001' ||
          error.driverError?.code === '40P01')
      ) {
        // Retry once on lock timeout
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.moveFromLockedToBalance(walletId, amount);
      }
      throw error;
    }
  }

  /**
   * Get wallet statement with signed transaction amounts
   * Transactions where wallet is fromWalletId are negative
   * Transactions where wallet is toWalletId are positive
   * Validates ownership: owner can view their own statement, admins can view any statement
   */
  async getWalletStatement(walletId: string): Promise<TransactionStatement[]> {
    const wallet = await this.walletRepository.findOneOrThrow(walletId);
    const { userProfileId } = RequestContext.get();

    if (!userProfileId) {
      throw new Error('User profile ID not found in context');
    }

    // Owner can always access
    if (wallet.ownerId !== userProfileId) {
      // Check if admin/super admin
      const isSuperAdmin =
        await this.accessControlHelperService.isSuperAdmin(userProfileId);
      const isAdmin =
        await this.accessControlHelperService.isAdmin(userProfileId);

      if (!isSuperAdmin && !isAdmin) {
        throw new InsufficientPermissionsException('t.messages.accessDenied');
      }
    }

    return await this.transactionRepository.getWalletStatement(walletId);
  }

  /**
   * Get paginated wallet statement with signed transaction amounts
   * Validates ownership: owner can view their own statement, admins can view any statement
   */
  async getWalletStatementPaginated(
    walletId: string,
    dto: PaginateTransactionDto,
  ): Promise<Pagination<TransactionStatement>> {
    const wallet = await this.walletRepository.findOneOrThrow(walletId);
    const { userProfileId } = RequestContext.get();

    if (!userProfileId) {
      throw new Error('User profile ID not found in context');
    }

    // Owner can always access
    if (wallet.ownerId !== userProfileId) {
      // Check if admin/super admin
      const isSuperAdmin =
        await this.accessControlHelperService.isSuperAdmin(userProfileId);
      const isAdmin =
        await this.accessControlHelperService.isAdmin(userProfileId);

      if (!isSuperAdmin && !isAdmin) {
        throw new InsufficientPermissionsException('t.messages.accessDenied');
      }
    }

    return await this.transactionRepository.getWalletStatementPaginated(
      walletId,
      dto,
    );
  }

  /**
   * Get total balance across all wallets owned by all profiles of a user
   */
  async getUserTotalBalance(userId: string): Promise<{
    totalBalance: Money;
    totalBonusBalance: Money;
    totalLockedBalance: Money;
    walletCount: number;
    details: Array<{
      userProfileId: string;
      userProfileType: string;
      walletType: WalletOwnerType;
      balance: Money;
      bonusBalance: Money;
      lockedBalance: Money;
    }>;
  }> {
    // Define the shape of raw query results
    interface RawWalletData {
      userprofileid: string;
      userprofiletype: string;
      wallettype: string;
      wallet_balance: string;
      wallet_bonusBalance: string;
      wallet_lockedBalance: string;
    }

    // Find all wallets by joining with user_profiles to get all profiles for this user

    const walletData = (await this.walletRepository
      .createQueryBuilder('wallet')
      .innerJoin(
        'user_profiles',
        'profile',
        'profile.id = wallet.ownerId AND profile.userId = :userId',
        { userId },
      )
      .where('wallet.ownerType = :ownerType', {
        ownerType: WalletOwnerType.USER_PROFILE,
      })
      .select([
        'wallet.ownerId as userProfileId',
        'profile.profileType as userProfileType',
        'wallet.ownerType as walletType',
        'wallet.balance',
        'wallet.bonusBalance',
        'wallet.lockedBalance',
      ])
      .getRawMany()) as RawWalletData[];

    if (walletData.length === 0) {
      return {
        totalBalance: Money.zero(),
        totalBonusBalance: Money.zero(),
        totalLockedBalance: Money.zero(),
        walletCount: 0,
        details: [],
      };
    }

    // Sum up all balances (handle null/undefined values)
    const totalBalance = walletData.reduce(
      (sum: Money, wallet) => sum.add(Money.from(wallet.wallet_balance || 0)),
      Money.zero(),
    );

    const totalBonusBalance = walletData.reduce(
      (sum: Money, wallet) =>
        sum.add(Money.from(wallet.wallet_bonusBalance || 0)),
      Money.zero(),
    );

    const totalLockedBalance = walletData.reduce(
      (sum: Money, wallet) =>
        sum.add(Money.from(wallet.wallet_lockedBalance || 0)),
      Money.zero(),
    );

    // Create detailed breakdown with profile information (handle null values)
    const details = walletData.map((wallet) => ({
      userProfileId: wallet.userprofileid,
      userProfileType: wallet.userprofiletype,
      walletType: wallet.wallettype as WalletOwnerType,
      balance: Money.from(wallet.wallet_balance || 0),
      bonusBalance: Money.from(wallet.wallet_bonusBalance || 0),
      lockedBalance: Money.from(wallet.wallet_lockedBalance || 0),
    }));

    return {
      totalBalance,
      totalBonusBalance,
      totalLockedBalance,
      walletCount: walletData.length,
      details,
    };
  }

  /**
   * Transfer money between wallets of the same user
   */
  @Transactional()
  async transferBetweenWallets(
    fromProfileId: string,
    toProfileId: string,
    amount: Money,
    userId: string,
    idempotencyKey?: string,
  ): Promise<{ fromWallet: Wallet; toWallet: Wallet; correlationId: string }> {
    // Validate that both profiles belong to the same user
    const [fromProfile, toProfile] = await Promise.all([
      this.userProfileRepository.findOneOrThrow(fromProfileId),
      this.userProfileRepository.findOneOrThrow(toProfileId),
    ]);

    if (fromProfile.userId !== userId || toProfile.userId !== userId) {
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message: 'Both profiles must belong to the same user',
      } as never);
    }

    if (fromProfileId === toProfileId) {
      throw new BusinessLogicException('t.messages.businessLogicError', {
        message: 'Cannot transfer to the same profile',
      } as never);
    }

    // Get both wallets
    const [fromWallet, toWallet] = await Promise.all([
      this.getWallet(fromProfileId, WalletOwnerType.USER_PROFILE),
      this.getWallet(toProfileId, WalletOwnerType.USER_PROFILE),
    ]);

    // Check sufficient balance
    if (fromWallet.balance.lessThan(amount)) {
      throw new InsufficientFundsException(
        't.messages.insufficientPermissions',
      );
    }

    // Perform the transfer atomically
    const updatedFromWallet = await this.updateBalance(
      fromWallet.id,
      amount.multiply(-1),
    );
    const updatedToWallet = await this.updateBalance(toWallet.id, amount);

    // Create transaction records with balance snapshots
    const correlationId = randomUUID();

    // Transaction for sender (debit)
    await this.transactionService.createTransaction(
      fromWallet.id,
      toWallet.id,
      amount.multiply(-1), // Negative amount for debit
      TransactionType.INTERNAL_TRANSFER,
      correlationId,
      updatedFromWallet.balance, // Balance after debit
    );

    // Transaction for receiver (credit)
    await this.transactionService.createTransaction(
      fromWallet.id,
      toWallet.id,
      amount, // Positive amount for credit
      TransactionType.INTERNAL_TRANSFER,
      correlationId,
      updatedToWallet.balance, // Balance after credit
    );

    this.logger.log(
      `Transferred ${amount.toString()} from profile ${fromProfileId} to profile ${toProfileId} for user ${userId}. Correlation ID: ${correlationId}`,
    );

    // Record internal transfer metrics for multi-profile behavior analysis
    // Note: centerId is determined from actor context since UserProfile doesn't have direct centerId
    const transferType = this.determineTransferType(
      fromProfile,
      toProfile,
      amount,
    );
    this.financeMonitorService.recordInternalTransfer(
      userId,
      amount,
      'same-center', // Placeholder - would need center resolution logic
      'same-center', // Placeholder - would need center resolution logic
      transferType,
    );

    // Audit log the transfer
    try {
      await this.activityLogService.log(
        FinanceActivityType.WALLET_TRANSFER_SENT,
        {
          amount: amount.toString(),
          fromWalletId: fromWallet.id,
          toWalletId: toWallet.id,
          fromProfileId,
          toProfileId,
          correlationId,
          senderBalanceAfter: updatedFromWallet.balance.toString(),
          receiverBalanceAfter: updatedToWallet.balance.toString(),
        },
        fromProfile.userId, // targetUserId
      );

      await this.activityLogService.log(
        FinanceActivityType.WALLET_TRANSFER_RECEIVED,
        {
          amount: amount.toString(),
          fromWalletId: fromWallet.id,
          toWalletId: toWallet.id,
          fromProfileId,
          toProfileId,
          correlationId,
          senderBalanceAfter: updatedFromWallet.balance.toString(),
          receiverBalanceAfter: updatedToWallet.balance.toString(),
        },
        toProfile.userId, // targetUserId
      );
    } catch (logError) {
      this.logger.warn('Failed to log wallet transfer activity', {
        correlationId,
        amount: amount.toString(),
        error: logError.message,
      });
    }

    return {
      fromWallet: updatedFromWallet,
      toWallet: updatedToWallet,
      correlationId,
    };
  }

  /**
   * Determine the type of internal transfer for analytics
   * This helps understand user behavior patterns in multi-profile systems
   */
  private determineTransferType(
    fromProfile: any,
    toProfile: any,
    amount: Money,
  ): 'consolidation' | 'distribution' | 'rebalancing' {
    // For now, classify all internal transfers as rebalancing
    // In future, could analyze patterns based on:
    // - Profile types (student vs teacher vs staff)
    // - Transfer amounts and frequency
    // - Center differences (when center info is available)
    return 'rebalancing';
  }
}
