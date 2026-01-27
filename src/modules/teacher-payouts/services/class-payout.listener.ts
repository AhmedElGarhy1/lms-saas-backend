import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TeacherPayoutService } from './teacher-payout.service';
import {
  ClassCreatedEvent,
  ClassStatusChangedEvent,
} from '@/modules/classes/events/class.events';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { PaymentStrategyService } from '@/modules/classes/services/payment-strategy.service';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { ClassesRepository } from '@/modules/classes/repositories/classes.repository';
import { ClassStatus } from '@/modules/classes/enums/class-status.enum';
import {
  calculateProratedMonthlyPayout,
  wasClassActiveInMonth,
} from '../utils/proration-calculator.util';
import { SYSTEM_ACTOR } from '@/shared/common/constants/system-actor.constant';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class ClassPayoutListener implements OnModuleInit {
  private readonly logger = new Logger(ClassPayoutListener.name);

  constructor(
    private readonly teacherPayoutService: TeacherPayoutService,
    private readonly paymentStrategyService: PaymentStrategyService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly classesRepository: ClassesRepository,
  ) {}

  onModuleInit(): void {
    // Register type-safe event listeners
    // Using TypeSafeEventEmitter ensures compile-time type safety between event name and payload type
    this.typeSafeEventEmitter.on(ClassEvents.CREATED, (event) => {
      void this.handleClassCreated(event);
    });
    this.typeSafeEventEmitter.on(ClassEvents.STATUS_CHANGED, (event) => {
      void this.handleClassStatusChanged(event);
    });
  }

  private async handleClassCreated(event: ClassCreatedEvent): Promise<void> {
    try {
      const classId = event.classEntity.id;
      this.logger.log(
        `Processing CLASS payout creation for new class: ${classId}`,
      );

      // Check if this class has CLASS payment strategy
      if (
        !event.teacherPaymentStrategy ||
        event.teacherPaymentStrategy.per !== TeacherPaymentUnit.CLASS
      ) {
        this.logger.debug(
          `Skipping non-CLASS payout strategy for class: ${classId}`,
        );
        return;
      }

      // Create the CLASS payout record with optional initial payment
      await this.teacherPayoutService.createClassPayout(
        event.classEntity,
        event.teacherPaymentStrategy,
        event.actor,
        event.teacherPaymentStrategy?.initialPaymentAmount,
        event.teacherPaymentStrategy?.paymentMethod,
      );

      const message = event.teacherPaymentStrategy?.initialPaymentAmount
        ? `Created CLASS payout for class ${classId}: total amount ${event.teacherPaymentStrategy.amount}, initial payment ${event.teacherPaymentStrategy.initialPaymentAmount}`
        : `Created CLASS payout for class ${classId}: total amount ${event.teacherPaymentStrategy.amount}`;

      this.logger.log(message);
    } catch (error) {
      const classId = event.classEntity.id;
      this.logger.error(
        `Failed to create CLASS payout for class ${classId}:`,
        error,
      );
      // Don't throw - class creation should not fail due to payout issues
    }
  }

  /**
   * Handle class status change to FINISHED
   * Creates final monthly payout immediately when class finishes (prorated for current month)
   */
  private async handleClassStatusChanged(
    event: ClassStatusChangedEvent,
  ): Promise<void> {
    try {
      // Only handle FINISHED status
      if (event.newStatus !== ClassStatus.FINISHED) {
        return;
      }

      this.logger.log(
        `Processing final monthly payout for finished class: ${event.classId}`,
      );

      // Fetch class with full relations (including startDate, endDate, teacherPaymentStrategy)
      const classEntity =
        await this.classesRepository.findClassWithFullRelationsOrThrow(
          event.classId,
        );

      // Check if class has MONTH payment strategy
      if (
        !classEntity.teacherPaymentStrategy ||
        classEntity.teacherPaymentStrategy.per !== TeacherPaymentUnit.MONTH
      ) {
        this.logger.debug(
          `Skipping non-MONTH payout strategy for class: ${event.classId}`,
        );
        return;
      }

      // Get current month and year
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // JS months are 0-based
      const currentYear = now.getFullYear();

      // Check if class was active during current month
      if (
        !wasClassActiveInMonth(
          classEntity.startDate,
          classEntity.endDate || null,
          currentMonth,
          currentYear,
        )
      ) {
        this.logger.debug(
          `Class ${event.classId} was not active during ${currentMonth}/${currentYear}, skipping final payout`,
        );
        return;
      }

      // Check if payout already exists for this month
      const existingPayouts =
        await this.teacherPayoutService.getTeacherPayoutsByTeacher(
          classEntity.teacherUserProfileId,
        );

      const existingPayout = existingPayouts.some(
        (payout) =>
          payout.classId === event.classId &&
          payout.month === currentMonth &&
          payout.year === currentYear &&
          payout.unitType === TeacherPaymentUnit.MONTH,
      );

      if (existingPayout) {
        this.logger.debug(
          `Payout already exists for teacher ${classEntity.teacherUserProfileId}, class ${event.classId}, ${currentMonth}/${currentYear}`,
        );
        return;
      }

      // Calculate prorated amount for current month (up to endDate)
      const proration = calculateProratedMonthlyPayout(
        classEntity.teacherPaymentStrategy.amount,
        classEntity.startDate,
        classEntity.endDate || null,
        currentMonth,
        currentYear,
      );

      // Skip if no active days (shouldn't happen, but safety check)
      if (proration.daysActive <= 0) {
        this.logger.debug(
          `No active days for class ${event.classId} in ${currentMonth}/${currentYear}, skipping payout`,
        );
        return;
      }

      // Create the final monthly payout with prorated amount
      await this.teacherPayoutService.createPayout(
        {
          teacherUserProfileId: classEntity.teacherUserProfileId,
          unitType: TeacherPaymentUnit.MONTH,
          unitPrice: proration.proratedAmount, // Use prorated amount
          unitCount: 1, // Fixed: 1 month (but amount is prorated)
          classId: event.classId,
          month: currentMonth,
          year: currentYear,
          branchId: classEntity.branchId,
          centerId: classEntity.centerId,
        },
        { ...SYSTEM_ACTOR, centerId: event.centerId } as ActorUser,
      );

      this.logger.log(
        `Created final MONTH payout for finished class ${event.classId}: ${proration.proratedAmount} (${proration.daysActive}/${proration.daysInMonth} days, ${proration.isFullMonth ? 'full' : 'prorated'}) for ${currentMonth}/${currentYear}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create final monthly payout for class ${event.classId}:`,
        error,
      );
      // Don't throw - class status change should not fail due to payout issues
    }
  }
}
