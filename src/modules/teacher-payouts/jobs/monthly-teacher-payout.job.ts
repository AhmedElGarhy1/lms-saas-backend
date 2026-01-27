import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RequestContext } from '@/shared/common/context/request.context';
import { Locale } from '@/shared/common/enums/locale.enum';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';
import { SYSTEM_ACTOR } from '@/shared/common/constants/system-actor.constant';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { TeacherPayoutService } from '../services/teacher-payout.service';
import { TeacherPaymentStrategyRepository } from '@/modules/classes/repositories/teacher-payment-strategy.repository';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { ClassStatus } from '@/modules/classes/enums/class-status.enum';
import {
  calculateProratedMonthlyPayout,
  wasClassActiveInMonth,
} from '../utils/proration-calculator.util';

@Injectable()
export class MonthlyTeacherPayoutJob {
  private readonly logger = new Logger(MonthlyTeacherPayoutJob.name);

  constructor(
    private readonly teacherPayoutService: TeacherPayoutService,
    private readonly teacherPaymentStrategyRepository: TeacherPaymentStrategyRepository,
  ) {}

  /**
   * Runs on the 1st day of each month at midnight to create monthly payouts
   * for teachers with MONTH payment strategies for the previous month.
   */
  @Cron('0 0 1 * *') // 1st of every month at 00:00
  async createMonthlyPayouts(): Promise<void> {
    const startMs = Date.now();
    const jobId = `monthly-teacher-payouts:${new Date().toISOString()}`;

    // Calculate previous month
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = previousMonth.getMonth() + 1; // JS months are 0-based
    const year = previousMonth.getFullYear();

    this.logger.log('Starting monthly teacher payouts job', {
      jobId,
      targetMonth: month,
      targetYear: year,
    });

    try {
      await RequestContext.run(
        {
          userId: SYSTEM_USER_ID,
          locale: Locale.EN,
          userProfileId: SYSTEM_USER_ID,
        },
        async () => {
          const payoutsCreated = await this.processMonthlyPayouts(month, year);

          this.logger.log('Monthly teacher payouts job completed', {
            jobId,
            durationMs: Date.now() - startMs,
            payoutsCreated,
            targetMonth: month,
            targetYear: year,
          });
        },
      );
    } catch (error) {
      this.logger.error(
        'Monthly teacher payouts job failed',
        error instanceof Error ? error.stack : String(error),
        {
          jobId,
          durationMs: Date.now() - startMs,
          targetMonth: month,
          targetYear: year,
        },
      );
      throw error;
    }
  }

  private async processMonthlyPayouts(
    month: number,
    year: number,
  ): Promise<number> {
    let totalPayoutsCreated = 0;

    // Find all teacher payment strategies with MONTH unit type
    const monthStrategies =
      await this.teacherPaymentStrategyRepository.findMany({
        where: { per: TeacherPaymentUnit.MONTH },
        relations: ['class'],
      });

    this.logger.debug(
      `Found ${monthStrategies.length} classes with MONTH payment strategies`,
    );

    for (const strategy of monthStrategies) {
      try {
        // Skip if class is not active
        if (strategy.class.status !== ClassStatus.ACTIVE) {
          this.logger.debug(
            `Skipping inactive class ${strategy.classId} (${strategy.class.status})`,
          );
          continue;
        }

        // Check if class was active during the target month
        const classStartDate = strategy.class.startDate;
        const classEndDate = strategy.class.endDate || null;

        if (!wasClassActiveInMonth(classStartDate, classEndDate, month, year)) {
          this.logger.debug(
            `Skipping class ${strategy.classId} - not active during ${month}/${year}`,
          );
          continue;
        }

        // Calculate prorated amount based on active days
        const proration = calculateProratedMonthlyPayout(
          strategy.amount,
          classStartDate,
          classEndDate,
          month,
          year,
        );

        // Skip if no active days (shouldn't happen, but safety check)
        if (proration.daysActive <= 0) {
          this.logger.debug(
            `Skipping class ${strategy.classId} - no active days in ${month}/${year}`,
          );
          continue;
        }

        // Check if payout already exists for this teacher/class/month/year
        const existingPayout = await this.checkExistingPayout(
          strategy.class.teacherUserProfileId,
          strategy.classId,
          month,
          year,
        );

        if (existingPayout) {
          this.logger.debug(
            `Payout already exists for teacher ${strategy.class.teacherUserProfileId}, class ${strategy.classId}, ${month}/${year}`,
          );
          continue;
        }

        // Create the monthly payout with prorated amount
        await this.teacherPayoutService.createPayout(
          {
            teacherUserProfileId: strategy.class.teacherUserProfileId,
            unitType: TeacherPaymentUnit.MONTH,
            unitPrice: proration.proratedAmount, // Use prorated amount
            unitCount: 1, // Fixed: 1 month (but amount is prorated)
            classId: strategy.classId,
            month,
            year,
            branchId: strategy.branchId,
            centerId: strategy.centerId,
          },
          { ...SYSTEM_ACTOR, centerId: strategy.centerId } as ActorUser,
        );

        totalPayoutsCreated++;
        this.logger.debug(
          `Created MONTH payout for teacher ${strategy.class.teacherUserProfileId}: ${proration.proratedAmount} (${proration.daysActive}/${proration.daysInMonth} days, ${proration.isFullMonth ? 'full' : 'prorated'}) for ${month}/${year}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create payout for class ${strategy.classId}`,
          error instanceof Error ? error.stack : String(error),
        );
        // Continue with other strategies even if one fails
      }
    }

    return totalPayoutsCreated;
  }

  private async checkExistingPayout(
    teacherUserProfileId: string,
    classId: string,
    month: number,
    year: number,
  ): Promise<boolean> {
    const existingPayouts =
      await this.teacherPayoutService.getTeacherPayoutsByTeacher(
        teacherUserProfileId,
      );

    return existingPayouts.some(
      (payout) =>
        payout.classId === classId &&
        payout.month === month &&
        payout.year === year &&
        payout.unitType === TeacherPaymentUnit.MONTH,
    );
  }
}
