import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ExpenseRepository } from '../repositories/expense.repository';
import { Expense } from '../entities/expense.entity';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { PaginateExpenseDto } from '../dto/paginate-expense.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseService } from '@/shared/common/services/base.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { PaymentService } from '@/modules/finance/services/payment.service';
import { Money } from '@/shared/common/utils/money.util';
import { WalletOwnerType } from '@/modules/finance/enums/wallet-owner-type.enum';
import { PaymentReason } from '@/modules/finance/enums/payment-reason.enum';
import { PaymentReferenceType } from '@/modules/finance/enums/payment-reference-type.enum';
import { ExpenseStatus } from '../enums/expense-status.enum';
import { randomUUID } from 'crypto';
import { RequestContext } from '@/shared/common/context/request.context';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';
import { ExpensesErrors } from '../exceptions/expenses.errors';
import { CentersErrors } from '@/modules/centers/exceptions/centers.errors';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { ExpenseEvents } from '@/shared/events/expenses.events.enum';
import {
  ExpenseCreatedEvent,
  ExpenseUpdatedEvent,
  ExpenseRefundedEvent,
} from '../events/expense.events';

@Injectable()
export class ExpenseService extends BaseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly paymentService: PaymentService,
    private readonly branchAccessService: BranchAccessService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {
    super();
  }

  /**
   * Get createdByProfileId from RequestContext or use SYSTEM_USER_ID
   */
  private getCreatedByProfileId(): string {
    const ctx = RequestContext.get();
    return ctx.userProfileId || SYSTEM_USER_ID;
  }

  /**
   * Create expense and immediately create CASH payment
   */
  @Transactional()
  async createExpense(
    dto: CreateExpenseDto,
    actor: ActorUser,
  ): Promise<Expense> {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.expenseRepository.findByIdempotencyKey(
        dto.idempotencyKey,
      );
      if (existing) {
        return existing;
      }
    }

    const centerId = dto.centerId || actor.centerId;
    if (!centerId) {
      throw CentersErrors.centerIdRequired();
    }

    // Validate center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId,
    });

    // Validate branch access if branchId is provided
    if (dto.branchId) {
      await this.branchAccessService.validateBranchAccess({
        userProfileId: actor.userProfileId,
        centerId,
        branchId: dto.branchId,
      });
    }

    // Verify center exists (access control already validated above)

    const amount = Money.from(dto.amount);
    const expenseId = randomUUID();

    // Create payment first (CASH payment)
    // Note: For expenses, we're paying FROM a branch cashbox TO an external vendor.
    // The receiverId is set to the actor's profile ID as a placeholder for the cash transaction's
    // receivedByProfileId field (who processed the expense), not the actual vendor.
    const paymentResult = await this.paymentService.createAndExecutePayment(
      {
        amount,
        senderId: dto.branchId, // Branch that owns the cashbox
        senderType: WalletOwnerType.BRANCH,
        receiverId: actor.userProfileId, // Actor's profile ID (used for cash transaction receivedByProfileId)
        receiverType: WalletOwnerType.USER_PROFILE,
        reason: PaymentReason.EXPENSE,
        paymentMethod: PaymentMethod.CASH,
        referenceType: PaymentReferenceType.EXPENSE,
        referenceId: expenseId,
        correlationId: randomUUID(),
        metadata: {
          expenseTitle: dto.title,
          expenseCategory: dto.category,
        },
      },
      actor,
    );

    // Create expense entity
    const expense = await this.expenseRepository.create({
      id: expenseId,
      centerId,
      branchId: dto.branchId,
      category: dto.category,
      title: dto.title,
      description: dto.description,
      amount,
      status: ExpenseStatus.PAID,
      paymentId: paymentResult.payment.id,
      paidAt: new Date(),
      createdByProfileId: this.getCreatedByProfileId(),
      idempotencyKey: dto.idempotencyKey,
    });

    this.logger.log(`Expense created and paid: ${expense.id}`);

    // Emit expense created event
    await this.typeSafeEventEmitter.emitAsync(
      ExpenseEvents.CREATED,
      new ExpenseCreatedEvent(expense, actor, dto),
    );

    return expense;
  }

  /**
   * Update expense (only title, description, category)
   */
  @Transactional()
  async updateExpense(
    id: string,
    dto: UpdateExpenseDto,
    actor: ActorUser,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findOneOrThrow(id);

    // Validate center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: expense.centerId,
    });

    // Cannot update if refunded
    if (expense.status === ExpenseStatus.REFUNDED) {
      throw ExpensesErrors.cannotUpdateRefundedExpense();
    }

    // Only allow updating title, description, and category
    if (dto.category !== undefined) {
      expense.category = dto.category;
    }
    if (dto.title !== undefined) {
      expense.title = dto.title;
    }
    if (dto.description !== undefined) {
      expense.description = dto.description;
    }

    const updatedExpense = (await this.expenseRepository.update(
      expense.id,
      expense,
    ))!;

    // Emit expense updated event
    await this.typeSafeEventEmitter.emitAsync(
      ExpenseEvents.UPDATED,
      new ExpenseUpdatedEvent(expense.id, dto, actor),
    );

    return updatedExpense;
  }

  /**
   * Refund expense payment
   */
  @Transactional()
  async refundExpense(id: string, actor: ActorUser): Promise<Expense> {
    const expense = await this.expenseRepository.findOneOrThrow(id);

    // Validate center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: expense.centerId,
    });

    // Check if expense is already refunded
    if (expense.status === ExpenseStatus.REFUNDED) {
      throw ExpensesErrors.expenseAlreadyRefunded();
    }

    // Check if expense is paid
    if (expense.status !== ExpenseStatus.PAID) {
      throw ExpensesErrors.onlyPaidExpensesCanBeRefunded();
    }

    // Refund the payment (PaymentService handles both wallet and cash)
    // For cash payments, it will reverse the cash transaction and update cashbox balance
    await this.paymentService.refundInternalPayment(expense.paymentId);

    // Update expense status
    expense.status = ExpenseStatus.REFUNDED;
    const updatedExpense = await this.expenseRepository.update(
      expense.id,
      expense,
    );

    this.logger.log(`Expense refunded: ${expense.id}`);

    // Emit expense refunded event
    await this.typeSafeEventEmitter.emitAsync(
      ExpenseEvents.REFUNDED,
      new ExpenseRefundedEvent(updatedExpense!, actor),
    );

    return updatedExpense!;
  }

  /**
   * Get single expense with access control
   */
  async getExpense(id: string, actor: ActorUser): Promise<Expense> {
    const expense = await this.expenseRepository.findOneOrThrow(id);

    // Validate center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: expense.centerId,
    });

    return expense;
  }

  /**
   * Get paginated expenses with filtering
   */
  async getExpensesPaginated(
    dto: PaginateExpenseDto,
    actor: ActorUser,
  ): Promise<Pagination<Expense>> {
    // Set centerId from context if not provided
    if (!dto.centerId && actor.centerId) {
      dto.centerId = actor.centerId;
    }

    return await this.expenseRepository.findExpensesPaginated(dto, actor);
  }
}
