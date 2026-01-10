import { Money } from '@/shared/common/utils/money.util';

export interface WithdrawalResult {
  amount: Money;
  method: 'wallet' | 'cashbox';
  branchId: string;
  staffId: string;
  timestamp: Date;
  transactionId: string;
  newBalance?: Money; // Made optional - not always available
  notes?: string;
}

export interface DepositResult {
  amount: Money;
  method: 'wallet' | 'cashbox';
  branchId: string;
  staffId: string;
  timestamp: Date;
  transactionId: string;
  newBalance?: Money; // Made optional - not always available
  notes?: string;
}

export interface WithdrawalTransaction {
  id: string;
  type: string;
  amount: Money;
  branchId: string;
  staffId: string;
  timestamp: Date;
  notes?: string;
}
