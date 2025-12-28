import { Injectable } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { CashTransactionRepository } from '../repositories/cash-transaction.repository';
import { EnrollmentRepository } from '@/modules/enrollments/repositories/enrollment.repository';
import { Money } from '@/shared/common/utils/money.util';
import { PaymentSource } from '../enums/payment-source.enum';
import { CashTransactionDirection } from '../enums/cash-transaction-direction.enum';
import { CashTransactionType } from '../enums/cash-transaction-type.enum';

interface RevenueReportFilters {
  startDate?: Date;
  endDate?: Date;
  centerId?: string;
  branchId?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly cashTransactionRepository: CashTransactionRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
  ) {}

  async getRevenueReport(filters: RevenueReportFilters): Promise<any> {
    const { startDate, endDate, centerId, branchId } = filters;

    // Default to current month if no dates provided
    const reportStartDate = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const reportEndDate = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    // Get cash revenue from cash transactions
    const cashSummary = await this.cashTransactionRepository.getCashSummaryForBranch(
      branchId || '', // TODO: Get from center if no branch specified
      reportStartDate,
      reportEndDate,
    );

    // Get wallet revenue from payments - simplified for now
    const walletRevenue = 0; // TODO: Implement wallet payment aggregation

    // Get package credits revenue from enrollments (these are prepaid, so count the original package purchases)
    // For now, we'll count enrollment amounts where paymentMethod is PACKAGE (though they're 0)
    // In a more sophisticated system, we'd track the original package purchase transactions
    const packageRevenue = 0; // TODO: Implement package revenue aggregation

    const totalRevenue = cashSummary.totalAmount + walletRevenue + packageRevenue;

    return {
      totalRevenue,
      breakdown: {
        cash: cashSummary.totalAmount,
        wallet: walletRevenue,
        packageCredits: packageRevenue,
      },
      period: {
        startDate: reportStartDate.toISOString().split('T')[0],
        endDate: reportEndDate.toISOString().split('T')[0],
      },
      summary: `Total revenue: ${totalRevenue.toFixed(2)} EGP (Cash: ${cashSummary.totalAmount.toFixed(2)}, Wallet: ${walletRevenue.toFixed(2)}, Package Credits: ${packageRevenue.toFixed(2)})`,
    };
  }

  async getCashReconciliation(branchId: string, date: Date): Promise<any> {
    // Get start and end of the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get cash collected from session payments for this branch on this date
    const cashSummary = await this.cashTransactionRepository.getCashSummaryForBranch(
      branchId,
      startOfDay,
      endOfDay,
    );

    // TODO: Get actual cashbox balance for the branch
    // For now, we'll assume we need to implement this
    const actualCashboxBalance = cashSummary.totalAmount; // Placeholder

    const discrepancy = actualCashboxBalance - cashSummary.totalAmount;
    let status = 'MATCHED';
    if (discrepancy > 0) status = 'OVER';
    else if (discrepancy < 0) status = 'UNDER';

    return {
      branchId,
      date: date.toISOString().split('T')[0],
      expectedCashFromSessions: cashSummary.totalAmount,
      actualCashboxBalance,
      discrepancy: Math.abs(discrepancy),
      status,
      sessionCount: cashSummary.count,
      summary: `Expected ${cashSummary.totalAmount.toFixed(2)} EGP from ${cashSummary.count} sessions. Cashbox shows ${actualCashboxBalance.toFixed(2)} EGP. ${discrepancy !== 0 ? `Discrepancy: ${discrepancy > 0 ? '+' : ''}${discrepancy.toFixed(2)} EGP.` : 'Perfect match!'}`,
    };
  }
}
