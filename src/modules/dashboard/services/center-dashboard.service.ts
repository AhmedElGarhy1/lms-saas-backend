import { Injectable, Logger } from '@nestjs/common';
import { CashboxService } from '@/modules/finance/services/cashbox.service';
import { PaymentService } from '@/modules/finance/services/payment.service';
import { TeacherPayoutService } from '@/modules/teacher-payouts/services/teacher-payout.service';
import { UserService } from '@/modules/user/services/user.service';
import { SessionsService } from '@/modules/sessions/services/sessions.service';
import { ClassesRepository } from '@/modules/classes/repositories/classes.repository';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Money } from '@/shared/common/utils/money.util';
import {
  CenterOverviewDto,
  PendingTeacherPayablesDto,
  PaymentMethodMetricsDto,
  TotalMetricsDto,
  CurrentMonthMetricsDto,
  AllTimeMetricsDto,
} from '../dto/center-overview.dto';

@Injectable()
export class CenterDashboardService {
  private readonly logger = new Logger(CenterDashboardService.name);

  constructor(
    private readonly cashboxService: CashboxService,
    private readonly paymentService: PaymentService,
    private readonly teacherPayoutsService: TeacherPayoutService,
    private readonly userService: UserService,
    private readonly sessionsService: SessionsService,
    private readonly classesRepository: ClassesRepository,
    private readonly groupsRepository: GroupsRepository,
  ) {}

  async getCenterOverview(actor: ActorUser): Promise<CenterOverviewDto> {
    const centerId = actor.centerId;
    if (!centerId) {
      throw new Error('User must be associated with a center');
    }

    this.logger.debug(`Getting dashboard overview for center ${centerId}`);

    // Get treasury stats first to get both cash and wallet balances
    const treasuryStats = await this.cashboxService.getCenterTreasuryStats(
      centerId,
      actor,
    );

    // Get all other metrics in parallel for better performance
    const [
      financialMetrics,
      pendingTeacherPayables,
      totalStudents,
      totalTeachers,
      totalStaff,
      monthlyActiveTeachers,
      monthlyActiveStudents,
      allTimeActiveTeachers,
      allTimeActiveStudents,
    ] = await Promise.all([
      this.getFinancialMetrics(centerId),
      this.getPendingTeacherPayables(centerId, actor),
      this.getTotalStudents(centerId),
      this.getTotalTeachers(centerId),
      this.getTotalStaff(centerId),
      this.getActiveTeachers(centerId), // Monthly active
      this.getActiveStudents(centerId), // Monthly active
      this.getAllTimeActiveTeachers(centerId), // Currently active (no time bound)
      this.getAllTimeActiveStudents(centerId), // Currently active (no time bound)
    ]);

    const currentMonth: CurrentMonthMetricsDto = {
      wallet: financialMetrics.wallet,
      cash: financialMetrics.cash,
      total: financialMetrics.total,
      activeTeachers: monthlyActiveTeachers,
      activeStudents: monthlyActiveStudents,
    };

    const allTime: AllTimeMetricsDto = {
      students: totalStudents,
      teachers: totalTeachers,
      staff: totalStaff,
      activeTeachers: allTimeActiveTeachers,
      activeStudents: allTimeActiveStudents,
    };

    return {
      cashBoxBalance: treasuryStats.cashbox,
      walletBalance: treasuryStats.wallet,
      currentMonth,
      allTime,
      pendingTeacherPayables,
      lastUpdated: new Date(),
    };
  }

  private async getCashBoxBalance(
    centerId: string,
    actor: ActorUser,
  ): Promise<Money> {
    try {
      const treasuryStats = await this.cashboxService.getCenterTreasuryStats(
        centerId,
        actor,
      );
      return treasuryStats.cashbox;
    } catch (error) {
      this.logger.error(
        `Failed to get cash box balance for center ${centerId}`,
        error,
      );
      return new Money(0); // Return zero on error
    }
  }

  private async getFinancialMetrics(centerId: string): Promise<{
    wallet: PaymentMethodMetricsDto;
    cash: PaymentMethodMetricsDto;
    total: TotalMetricsDto;
  }> {
    try {
      // Get current month and year
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // JavaScript months are 0-based

      // Get payment metrics for the month
      const paymentMetrics =
        await this.paymentService.getCenterFinancialMetricsForMonth(
          centerId,
          currentYear,
          currentMonth,
        );

      // Calculate net for each payment method
      const wallet: PaymentMethodMetricsDto = {
        revenue: paymentMetrics.wallet.revenue,
        expenses: paymentMetrics.wallet.expenses,
        net: paymentMetrics.wallet.revenue.subtract(
          paymentMetrics.wallet.expenses,
        ),
      };

      const cash: PaymentMethodMetricsDto = {
        revenue: paymentMetrics.cash.revenue,
        expenses: paymentMetrics.cash.expenses,
        net: paymentMetrics.cash.revenue.subtract(paymentMetrics.cash.expenses),
      };

      // Calculate totals
      const totalRevenue = wallet.revenue.add(cash.revenue);
      const totalExpenses = wallet.expenses.add(cash.expenses);

      const total: TotalMetricsDto = {
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue.subtract(totalExpenses),
      };

      return { wallet, cash, total };
    } catch (error) {
      this.logger.error(
        `Failed to get financial metrics for center ${centerId}`,
        error,
      );
      // Return zero values on error
      const zeroMetrics: PaymentMethodMetricsDto = {
        revenue: new Money(0),
        expenses: new Money(0),
        net: new Money(0),
      };
      return {
        wallet: zeroMetrics,
        cash: zeroMetrics,
        total: {
          revenue: new Money(0),
          expenses: new Money(0),
          profit: new Money(0),
        },
      };
    }
  }

  private async getPendingTeacherPayables(
    centerId: string,
    actor: ActorUser,
  ): Promise<PendingTeacherPayablesDto> {
    try {
      const result =
        await this.teacherPayoutsService.getPendingPayoutsForCenter(centerId);
      return {
        count: result.count,
        totalAmount: result.totalAmount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get pending teacher payables for center ${centerId}`,
        error,
      );
      return {
        count: 0,
        totalAmount: new Money(0),
      };
    }
  }

  private async getTotalStudents(centerId: string): Promise<number> {
    try {
      return await this.userService.countStudentsForCenter(centerId);
    } catch (error) {
      this.logger.error(
        `Failed to get total students for center ${centerId}`,
        error,
      );
      return 0;
    }
  }

  private async getTotalTeachers(centerId: string): Promise<number> {
    try {
      return await this.userService.countTeachersForCenter(centerId);
    } catch (error) {
      this.logger.error(
        `Failed to get total teachers for center ${centerId}`,
        error,
      );
      return 0;
    }
  }

  private async getTotalStaff(centerId: string): Promise<number> {
    try {
      return await this.userService.countStaffForCenter(centerId);
    } catch (error) {
      this.logger.error(
        `Failed to get total staff for center ${centerId}`,
        error,
      );
      return 0;
    }
  }

  private async getActiveTeachers(centerId: string): Promise<number> {
    try {
      return await this.sessionsService.countActiveTeachersForCenter(centerId);
    } catch (error) {
      this.logger.error(
        `Failed to get active teachers for center ${centerId}`,
        error,
      );
      return 0;
    }
  }

  private async getActiveStudents(centerId: string): Promise<number> {
    try {
      return await this.sessionsService.countActiveStudentsForCenter(centerId);
    } catch (error) {
      this.logger.error(
        `Failed to get active students for center ${centerId}`,
        error,
      );
      return 0;
    }
  }

  private async getAllTimeActiveTeachers(centerId: string): Promise<number> {
    try {
      return await this.classesRepository.countActiveTeachersForCenter(
        centerId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get all-time active teachers for center ${centerId}`,
        error,
      );
      return 0;
    }
  }

  private async getAllTimeActiveStudents(centerId: string): Promise<number> {
    try {
      return await this.groupsRepository.countActiveStudentsForCenter(centerId);
    } catch (error) {
      this.logger.error(
        `Failed to get all-time active students for center ${centerId}`,
        error,
      );
      return 0;
    }
  }
}
