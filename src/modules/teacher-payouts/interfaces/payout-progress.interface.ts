import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { PayoutStatus } from '../enums/payout-status.enum';

export interface PayoutProgress {
  totalAmount: number;
  totalPaid: number;
  remaining: number;
  progress: number;
  lastPayment?: number;
  payoutType: TeacherPaymentUnit;
  payoutStatus: PayoutStatus;
}

export interface TeacherPayoutSummary {
  totalPayouts: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  overallProgress: number;
  byType: Record<TeacherPaymentUnit, PayoutTypeSummary>;
}

export interface PayoutTypeSummary {
  count: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  progress: number;
}
