import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Transactional } from '@nestjs-cls/transactional';
import {
  StudentClassSubscription,
  SubscriptionStatus,
  PaymentSource,
} from '../entities/student-class-subscription.entity';
import {
  StudentSessionCharge,
  ChargeStatus,
} from '../entities/student-session-charge.entity';
import { StudentClassCharge } from '../entities/student-class-charge.entity';
import {
  StudentBillingRecord,
  StudentBillingType,
} from '../entities/student-billing-record.entity';
import { CreateMonthlySubscriptionDto } from '../dto/create-monthly-subscription.dto';
import { CreateSessionChargeDto } from '../dto/create-session-charge.dto';
import { CreateClassChargeDto } from '../dto/create-class-charge.dto';
import {
  CreateStudentChargeDto,
  ChargeType,
} from '../dto/create-student-charge.dto';
import { PaginateStudentBillingRecordsDto } from '../dto/paginate-student-billing-records.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { PaymentService, ExecutePaymentRequest } from '@/modules/finance/services/payment.service';
import { PaymentReason } from '@/modules/finance/enums/payment-reason.enum';
import { PaymentSource as FinancePaymentSource } from '@/modules/finance/enums/payment-source.enum';
import { WalletOwnerType } from '@/modules/finance/enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { ClassesService } from '@/modules/classes/services/classes.service';
import { PaymentStrategyService } from '@/modules/classes/services/payment-strategy.service';
import { SessionsRepository } from '@/modules/sessions/repositories/sessions.repository';
import { StudentBillingRecordsRepository } from '../repositories/student-billing-records.repository';
import { StudentClassSubscriptionsRepository } from '../repositories/student-class-subscriptions.repository';
import { StudentSessionChargesRepository } from '../repositories/student-session-charges.repository';
import { StudentClassChargesRepository } from '../repositories/student-class-charges.repository';
import { BaseService } from '@/shared/common/services/base.service';
import { StudentBillingErrors } from '../exceptions/student-billing.errors';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class StudentBillingService extends BaseService {
  constructor(
    private subscriptionRepo: StudentClassSubscriptionsRepository,
    private sessionChargeRepo: StudentSessionChargesRepository,
    private classChargesRepository: StudentClassChargesRepository,
    private billingRecordsRepository: StudentBillingRecordsRepository,
    private paymentService: PaymentService,
    private classesService: ClassesService,
    private paymentStrategyService: PaymentStrategyService,
    private sessionsRepository: SessionsRepository,
  ) {
    super();
  }

  /**
   * Validate that monthly subscriptions are allowed for this class
   */
  async validateMonthlySubscriptionAllowed(classId: string): Promise<void> {
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (!paymentStrategy) {
      throw StudentBillingErrors.subscriptionPaymentStrategyMissing();
    }

    if (!paymentStrategy.includeMonth) {
      throw StudentBillingErrors.monthlySubscriptionsNotAllowed();
    }
  }

  /**
   * Validate that session charges are allowed for this class
   */
  async validateSessionChargeAllowed(classId: string): Promise<void> {
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (!paymentStrategy) {
      throw StudentBillingErrors.subscriptionPaymentStrategyMissing();
    }

    if (!paymentStrategy.includeSession) {
      throw StudentBillingErrors.sessionChargesNotAllowed();
    }
  }

  /**
   * Get validated payment price for a class
   */
  async getValidatedPaymentPrice(
    classId: string,
    paymentType: 'session' | 'month',
  ): Promise<number> {
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (!paymentStrategy) {
      throw StudentBillingErrors.subscriptionPaymentStrategyMissing();
    }

    if (paymentType === 'session') {
      if (!paymentStrategy.includeSession || !paymentStrategy.sessionPrice) {
        throw StudentBillingErrors.sessionPaymentsNotConfigured();
      }
      return paymentStrategy.sessionPrice;
    }

    if (paymentType === 'month') {
      if (!paymentStrategy.includeMonth || !paymentStrategy.monthPrice) {
        throw StudentBillingErrors.monthlyPaymentsNotConfigured();
      }
      return paymentStrategy.monthPrice;
    }

    throw new Error('Invalid payment type');
  }

  /**
   * Validate that class charges are allowed for this class
   */
  async validateClassChargeAllowed(classId: string): Promise<void> {
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (!paymentStrategy) {
      throw StudentBillingErrors.subscriptionPaymentStrategyMissing();
    }

    if (!paymentStrategy.includeClass) {
      throw StudentBillingErrors.classChargesNotAllowed();
    }
  }

  /**
   * Get validated class charge price for a class
   */
  async getValidatedClassPrice(classId: string): Promise<number> {
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (!paymentStrategy) {
      throw StudentBillingErrors.subscriptionPaymentStrategyMissing();
    }

    if (!paymentStrategy.includeClass || !paymentStrategy.classPrice) {
      throw StudentBillingErrors.classPaymentsNotConfigured();
    }

    return paymentStrategy.classPrice;
  }

  /**
   * Check if student has paid class charge for a class
   */
  async hasPaidClassCharge(
    studentUserProfileId: string,
    classId: string,
  ): Promise<boolean> {
    const paidCharge = await this.classChargesRepository.findPaidClassCharge(
      studentUserProfileId,
      classId,
    );
    return !!paidCharge;
  }

  /**
   * Create a monthly subscription for a student
   * Handles payment processing and billing record creation
   */
  @Transactional()
  async createMonthlySubscription(
    dto: CreateMonthlySubscriptionDto,
  ): Promise<StudentClassSubscription> {
    // ✅ VALIDATE: Check if monthly subscriptions are allowed
    await this.validateMonthlySubscriptionAllowed(dto.classId);

    // Get class information
    const classEntity = await this.classesService.findOneOrThrow(dto.classId);

    // ✅ GET PRICE: Use validated class-configured price
    const amount = await this.getValidatedPaymentPrice(dto.classId, 'month');

    // Check for duplicate subscription for the same month
    const existingSubscription =
      await this.subscriptionRepo.findExistingSubscription(
        dto.studentUserProfileId,
        dto.classId,
        dto.year,
        dto.month,
      );

    if (existingSubscription) {
      throw StudentBillingErrors.subscriptionAlreadyExists();
    }

    // Create payment based on payment source
    // Execute payment using unified API
    const paymentRequest: ExecutePaymentRequest = {
      amount: Money.from(amount),
      senderId: dto.studentUserProfileId,
      senderType: WalletOwnerType.USER_PROFILE,
      receiverId: classEntity.branchId,
      receiverType: WalletOwnerType.BRANCH,
      reason: PaymentReason.SUBSCRIPTION,
      source: dto.paymentSource === PaymentSource.WALLET ? FinancePaymentSource.WALLET : FinancePaymentSource.CASH,
      correlationId: randomUUID(),
    };

    const paymentResult = await this.paymentService.createAndExecutePayment(paymentRequest);
    const payment = paymentResult.payment;

    // Get payment strategy for billing record
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        dto.classId,
      );

    // Create subscription
    const savedSubscription = await this.subscriptionRepo.createSubscription({
      studentUserProfileId: dto.studentUserProfileId,
      classId: dto.classId,
      month: dto.month,
      year: dto.year,
      paymentSource: dto.paymentSource,
      paymentId: payment.id,
    });

    // Create billing record for reporting
    await this.billingRecordsRepository.createBillingRecord({
      studentUserProfileId: dto.studentUserProfileId,
      type: StudentBillingType.MONTHLY,
      refId: paymentStrategy!.id, // Reference the strategy
      paymentSource: dto.paymentSource,
      amount: Money.from(amount),
    });

    return savedSubscription;
  }

  /**
   * Create a session charge for a student
   * Handles payment processing and billing record creation
   */
  @Transactional()
  async createSessionCharge(
    dto: CreateSessionChargeDto,
  ): Promise<StudentSessionCharge> {
    // Get session information
    const session = await this.sessionsRepository.findOneOrThrow(dto.sessionId);
    const classId = session.classId;

    // ✅ VALIDATE: Check if session charges are allowed
    await this.validateSessionChargeAllowed(classId);

    // ✅ GET PRICE: Use validated class-configured price
    const amount = await this.getValidatedPaymentPrice(classId, 'session');

    // Check if student already paid for this session
    const existingCharge =
      await this.sessionChargeRepo.findExistingSessionCharge(
        dto.studentUserProfileId,
        dto.sessionId,
      );

    if (existingCharge) {
      throw StudentBillingErrors.sessionChargeAlreadyExists();
    }

    // Execute payment using unified API
    const paymentRequest: ExecutePaymentRequest = {
      amount: Money.from(amount),
      senderId: dto.studentUserProfileId,
      senderType: WalletOwnerType.USER_PROFILE,
      receiverId: session.branchId,
      receiverType: WalletOwnerType.BRANCH,
      reason: PaymentReason.SESSION,
      source: dto.paymentSource === PaymentSource.WALLET ? FinancePaymentSource.WALLET : FinancePaymentSource.CASH,
      correlationId: randomUUID(),
    };

    const paymentResult = await this.paymentService.createAndExecutePayment(paymentRequest);
    const payment = paymentResult.payment;

    // Get payment strategy for billing record
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    // Create session charge
    const savedCharge = await this.sessionChargeRepo.createSessionCharge({
      studentUserProfileId: dto.studentUserProfileId,
      sessionId: dto.sessionId,
      classId,
      amount,
      paymentSource: dto.paymentSource,
      paymentId: payment.id,
      paidAt: new Date(),
    });

    // Create billing record for reporting
    await this.billingRecordsRepository.createBillingRecord({
      studentUserProfileId: dto.studentUserProfileId,
      type: StudentBillingType.SESSION,
      refId: paymentStrategy!.id, // Reference the strategy
      paymentSource: dto.paymentSource,
      amount: Money.from(amount),
    });

    return savedCharge;
  }

  /**
   * Create a class charge for a student
   * Handles payment processing and billing record creation
   */
  @Transactional()
  async createClassCharge(
    dto: CreateClassChargeDto,
  ): Promise<StudentClassCharge> {
    // ✅ VALIDATE: Check if class charges are allowed
    await this.validateClassChargeAllowed(dto.classId);

    // Get class information for branch details
    const classEntity = await this.classesService.findOneOrThrow(dto.classId);

    // ✅ GET PRICE: Use validated class-configured price
    const amount = await this.getValidatedClassPrice(dto.classId);

    // Check if student already paid for this class
    const existingCharge =
      await this.classChargesRepository.findExistingClassCharge(
        dto.studentUserProfileId,
        dto.classId,
      );

    if (existingCharge) {
      throw StudentBillingErrors.classChargeAlreadyExists();
    }

    // Execute payment using unified API
    const paymentRequest: ExecutePaymentRequest = {
      amount: Money.from(amount),
      senderId: dto.studentUserProfileId,
      senderType: WalletOwnerType.USER_PROFILE,
      receiverId: classEntity.branchId,
      receiverType: WalletOwnerType.BRANCH,
      reason: PaymentReason.CLASS,
      source: dto.paymentSource === PaymentSource.WALLET ? FinancePaymentSource.WALLET : FinancePaymentSource.CASH,
      correlationId: randomUUID(),
    };

    const paymentResult = await this.paymentService.createAndExecutePayment(paymentRequest);
    const payment = paymentResult.payment;

    // Get payment strategy for billing record
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        dto.classId,
      );

    // Create class charge
    const savedCharge = await this.classChargesRepository.createClassCharge({
      studentUserProfileId: dto.studentUserProfileId,
      classId: dto.classId,
      amount,
      paymentSource: dto.paymentSource,
      paymentId: payment.id,
      paidAt: new Date(),
    });

    // Create billing record for reporting
    await this.billingRecordsRepository.createBillingRecord({
      studentUserProfileId: dto.studentUserProfileId,
      type: StudentBillingType.CLASS,
      refId: paymentStrategy!.id, // Reference the strategy
      paymentSource: dto.paymentSource,
      amount: Money.from(amount),
    });

    return savedCharge;
  }

  /**
   * Create a student charge (subscription or session) with specified payment source
   */
  @Transactional()
  async createStudentCharge(
    dto: CreateStudentChargeDto,
    paymentSource: PaymentSource,
  ): Promise<
    StudentClassSubscription | StudentSessionCharge | StudentClassCharge
  > {
    if (dto.type === ChargeType.SUBSCRIPTION) {
      if (!dto.classId || dto.year === undefined || dto.month === undefined) {
        throw new Error(
          'classId, year, and month are required for subscription charges',
        );
      }

      const subscriptionDto: CreateMonthlySubscriptionDto = {
        studentUserProfileId: dto.studentUserProfileId,
        classId: dto.classId,
        paymentSource,
        year: dto.year,
        month: dto.month,
      };

      return this.createMonthlySubscription(subscriptionDto);
    } else if (dto.type === ChargeType.SESSION) {
      if (!dto.sessionId) {
        throw new Error('sessionId is required for session charges');
      }

      const chargeDto: CreateSessionChargeDto = {
        studentUserProfileId: dto.studentUserProfileId,
        sessionId: dto.sessionId,
        paymentSource,
      };

      return this.createSessionCharge(chargeDto);
    } else if (dto.type === ChargeType.CLASS) {
      if (!dto.classId) {
        throw new Error('classId is required for class charges');
      }

      const chargeDto: CreateClassChargeDto = {
        studentUserProfileId: dto.studentUserProfileId,
        classId: dto.classId,
        paymentSource,
      };

      return this.createClassCharge(chargeDto);
    }

    throw new Error('Invalid charge type');
  }

  /**
   * Get payment strategy for a class (used by attendance module for detailed error messages)
   */
  async getClassPaymentStrategy(classId: string) {
    return this.paymentStrategyService.getStudentPaymentStrategyForClass(
      classId,
    );
  }

  /**
   * Check if a student is allowed to attend a class/session
   * This is the core method called by SessionsService.checkIn()
   */
  async checkStudentAccess(
    studentUserProfileId: string,
    classId: string,
    sessionId?: string,
  ): Promise<boolean> {
    // First check if student has active monthly subscription for this class
    const activeSubscription = await this.getActiveSubscription(
      studentUserProfileId,
      classId,
    );
    if (activeSubscription) {
      return true;
    }

    // Check if class charges are enabled for this class
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );
    if (paymentStrategy?.includeClass) {
      // Class charges are enabled - check if student has paid
      const hasPaidClassCharge = await this.hasPaidClassCharge(
        studentUserProfileId,
        classId,
      );
      if (hasPaidClassCharge) {
        return true;
      }
    }

    // If no monthly subscription and class charges not paid (or not enabled),
    // check if they paid for session access under this strategy
    if (sessionId && paymentStrategy) {
      return this.hasPaidForSessionAccess(
        studentUserProfileId,
        paymentStrategy.id,
      );
    }

    return false;
  }

  /**
   * Get active monthly subscription for a student in a class
   */
  async getActiveSubscription(
    studentUserProfileId: string,
    classId: string,
  ): Promise<StudentClassSubscription | null> {
    return this.subscriptionRepo.findActiveSubscription(
      studentUserProfileId,
      classId,
    );
  }

  /**
   * Check if student has paid for session access under a strategy
   */
  async hasPaidForSessionAccess(
    studentUserProfileId: string,
    strategyId: string,
  ): Promise<boolean> {
    // Check if student has session billing under this strategy
    // This means paying once gives access to all sessions under that strategy
    const record = await this.billingRecordsRepository.findSessionBillingRecord(
      studentUserProfileId,
      strategyId,
    );
    return !!record;
  }

  /**
   * Cancel a subscription (for refunds or other reasons)
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    const subscription =
      await this.subscriptionRepo.findSubscriptionById(subscriptionId);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    await this.subscriptionRepo.saveSubscription(subscription);
  }

  /**
   * Cancel a session charge (for refunds)
   */
  async cancelSessionCharge(chargeId: string): Promise<void> {
    const charge = await this.sessionChargeRepo.findSessionChargeById(chargeId);

    if (!charge) {
      throw new NotFoundException('Session charge not found');
    }

    charge.status = ChargeStatus.CANCELLED;
    await this.sessionChargeRepo.saveSessionCharge(charge);
  }

  /**
   * Get billing records for a student (for reporting)
   */
  async getStudentBillingRecords(
    paginateDto: PaginateStudentBillingRecordsDto,
    actor: ActorUser,
  ): Promise<Pagination<StudentBillingRecord>> {
    return this.billingRecordsRepository.paginateStudentBillingRecords(
      paginateDto,
      actor,
    );
  }
}
