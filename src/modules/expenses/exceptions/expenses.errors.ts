import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { ExpenseErrorCode } from '../enums/expenses.codes';

/**
 * Expenses-specific error helpers
 * Clean, simple, and maintainable error creation
 */
export class ExpensesErrors extends BaseErrorHelpers {
  static expenseNotFound(): DomainException {
    return this.createNoDetails(ExpenseErrorCode.EXPENSE_NOT_FOUND);
  }

  static cannotUpdateRefundedExpense(): DomainException {
    return this.createNoDetails(
      ExpenseErrorCode.CANNOT_UPDATE_REFUNDED_EXPENSE,
    );
  }

  static expenseAlreadyRefunded(): DomainException {
    return this.createNoDetails(ExpenseErrorCode.EXPENSE_ALREADY_REFUNDED);
  }

  static onlyPaidExpensesCanBeRefunded(): DomainException {
    return this.createNoDetails(
      ExpenseErrorCode.ONLY_PAID_EXPENSES_CAN_BE_REFUNDED,
    );
  }
}
