import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TeacherPayoutService } from './teacher-payout.service';
import { ClassCreatedEvent } from '@/modules/classes/events/class.events';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { PaymentStrategyService } from '@/modules/classes/services/payment-strategy.service';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';

@Injectable()
export class ClassPayoutListener implements OnModuleInit {
  private readonly logger = new Logger(ClassPayoutListener.name);

  constructor(
    private readonly teacherPayoutService: TeacherPayoutService,
    private readonly paymentStrategyService: PaymentStrategyService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  onModuleInit(): void {
    // Register type-safe event listeners
    // Using TypeSafeEventEmitter ensures compile-time type safety between event name and payload type
    this.typeSafeEventEmitter.on(ClassEvents.CREATED, (event) => {
      void this.handleClassCreated(event);
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
}
