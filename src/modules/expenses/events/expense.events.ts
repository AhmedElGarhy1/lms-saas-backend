import { Expense } from '../entities/expense.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseEvent } from '@/shared/common/base/base-event';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that an expense was created and paid.
 */
export class ExpenseCreatedEvent extends BaseEvent {
  constructor(
    public readonly expense: Expense,
    actor: ActorUser,
    public readonly expenseData: CreateExpenseDto,
  ) {
    super(actor);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that an expense was updated.
 */
export class ExpenseUpdatedEvent extends BaseEvent {
  constructor(
    public readonly expenseId: string,
    public readonly updates: Partial<UpdateExpenseDto>,
    actor: ActorUser,
  ) {
    super(actor);
  }
}

/**
 * Event (result-focused, output-oriented)
 * Represents the fact that an expense was refunded.
 */
export class ExpenseRefundedEvent extends BaseEvent {
  constructor(
    public readonly expense: Expense,
    actor: ActorUser,
  ) {
    super(actor);
  }
}
