import { Injectable, NotFoundException } from '@nestjs/common';
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
import {
  StudentBillingRecord,
  BillingRecordType,
} from '../entities/student-billing-record.entity';
import { CreateMonthlySubscriptionDto } from '../dto/create-monthly-subscription.dto';
import { CreateSessionChargeDto } from '../dto/create-session-charge.dto';
import {
  CreateStudentChargeDto,
  ChargeType,
} from '../dto/create-student-charge.dto';
import { PaginateStudentBillingRecordsDto } from '../dto/paginate-student-billing-records.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { PaymentService } from '@/modules/finance/services/payment.service';
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
import { BaseService } from '@/shared/common/services/base.service';
import { StudentBillingErrors } from '../exceptions/student-billing.errors';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class StudentBillingService extends BaseService {
  constructor(
    private subscriptionRepo: StudentClassSubscriptionsRepository,
    private sessionChargeRepo: StudentSessionChargesRepository,
    private billingRecordsRepository: StudentBillingRecordsRepository,
    private paymentService: PaymentService,
    private classesService: ClassesService,
    private paymentStrategyService: PaymentStrategyService,
    private sessionsRepository: SessionsRepository,
  ) {
    super();
  }

  /**
   * Create a monthly subscription for a student
   * Handles payment processing and billing record creation
   */
  @Transactional()
  async createMonthlySubscription(
    dto: CreateMonthlySubscriptionDto,
  ): Promise<StudentClassSubscription> {
    // Get class information
    const classEntity = await this.classesService.findOneOrThrow(dto.classId);

    // Get pricing information
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        dto.classId,
      );

    if (!paymentStrategy?.monthPrice) {
      throw StudentBillingErrors.subscriptionPaymentStrategyMissing();
    }

    const amount = paymentStrategy.monthPrice;

    // Calculate subscription dates based on monthYear
    const [year, month] = dto.monthYear.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 0); // Last day of month

    // Check for duplicate subscription for the same month
    const existingSubscription =
      await this.subscriptionRepo.findExistingSubscription(
        dto.studentUserProfileId,
        dto.classId,
        dto.monthYear,
      );

    if (existingSubscription) {
      throw StudentBillingErrors.subscriptionAlreadyExists();
    }

    // Create payment based on payment source
    let payment;
    if (dto.paymentSource === PaymentSource.WALLET) {
      payment = await this.paymentService.createPayment(
        Money.from(amount),
        dto.studentUserProfileId, // sender ID
        WalletOwnerType.USER_PROFILE, // sender type
        classEntity.branchId, // receiver ID (branch)
        WalletOwnerType.BRANCH, // receiver type
        PaymentReason.SUBSCRIPTION,
        FinancePaymentSource.WALLET,
        undefined, // reference type
        undefined, // reference ID
      );
    } else if (dto.paymentSource === PaymentSource.CASH) {
      console.log(
        Money.from(amount),
        dto.studentUserProfileId, // payer profile ID
        classEntity.branchId, // receiver ID (branch)
        WalletOwnerType.BRANCH, // receiver type
        PaymentReason.SUBSCRIPTION,
        FinancePaymentSource.CASH,
        undefined, // reference type
        undefined, // reference ID
      );
      payment = await this.paymentService.createPayment(
        Money.from(amount),
        dto.studentUserProfileId, // sender ID
        WalletOwnerType.USER_PROFILE, // sender type
        classEntity.branchId, // receiver ID (branch)
        WalletOwnerType.BRANCH, // receiver type
        PaymentReason.SUBSCRIPTION,
        FinancePaymentSource.CASH,
        undefined, // reference type
        undefined, // reference ID
      );
    } else {
      throw StudentBillingErrors.subscriptionInvalidPaymentSource();
    }

    // Create subscription
    const savedSubscription = await this.subscriptionRepo.createSubscription({
      ...dto,
      startDate,
      endDate,
      paymentId: payment.id,
    });

    // Create billing record for reporting
    await this.billingRecordsRepository.createBillingRecord({
      studentUserProfileId: dto.studentUserProfileId,
      classId: dto.classId,
      type: BillingRecordType.MONTHLY,
      paymentSource: dto.paymentSource,
      amount: Money.from(amount),
    });

    // Complete the payment to finalize the transaction
    await this.paymentService.completePayment(
      payment.id,
      dto.studentUserProfileId,
    );

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

    // Get pricing information for the session's class
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        session.classId,
      );

    if (!paymentStrategy?.sessionPrice) {
      throw StudentBillingErrors.sessionChargePaymentStrategyMissing();
    }

    const amount = paymentStrategy.sessionPrice;
    const classId = session.classId;

    // Check if student already paid for this session
    const existingCharge =
      await this.sessionChargeRepo.findExistingSessionCharge(
        dto.studentUserProfileId,
        dto.sessionId,
      );

    if (existingCharge) {
      throw StudentBillingErrors.sessionChargeAlreadyExists();
    }

    // Create payment based on payment source
    let payment;
    if (dto.paymentSource === PaymentSource.WALLET) {
      payment = await this.paymentService.createPayment(
        Money.from(amount),
        dto.studentUserProfileId, // sender ID
        WalletOwnerType.USER_PROFILE, // sender type
        session.branchId, // receiver ID (branch)
        WalletOwnerType.BRANCH, // receiver type
        PaymentReason.SESSION,
        FinancePaymentSource.WALLET,
        undefined, // reference type
        undefined, // reference ID
        `Session charge for ${session.startTime.toISOString()}`, // correlation ID
      );
    } else if (dto.paymentSource === PaymentSource.CASH) {
      payment = await this.paymentService.createPayment(
        Money.from(amount),
        dto.studentUserProfileId, // sender ID
        WalletOwnerType.USER_PROFILE, // sender type
        session.branchId, // receiver ID (branch)
        WalletOwnerType.BRANCH, // receiver type
        PaymentReason.SESSION,
        FinancePaymentSource.CASH,
        undefined, // reference type
        undefined, // reference ID
        `Session charge for ${session.startTime.toISOString()}`, // correlation ID
      );
    } else {
      throw StudentBillingErrors.sessionChargeInvalidPaymentSource();
    }

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
      classId,
      sessionId: dto.sessionId,
      type: BillingRecordType.SESSION,
      paymentSource: dto.paymentSource,
      amount: Money.from(amount),
    });

    // Complete the payment to finalize the transaction
    await this.paymentService.completePayment(
      payment.id,
      dto.studentUserProfileId,
    );

    return savedCharge;
  }

  /**
   * Create a student charge (subscription or session) with specified payment source
   */
  @Transactional()
  async createStudentCharge(
    dto: CreateStudentChargeDto,
    paymentSource: PaymentSource,
  ): Promise<StudentClassSubscription | StudentSessionCharge> {
    if (dto.type === ChargeType.SUBSCRIPTION) {
      if (!dto.classId || !dto.monthYear) {
        throw new Error(
          'classId and monthYear are required for subscription charges',
        );
      }

      const subscriptionDto: CreateMonthlySubscriptionDto = {
        studentUserProfileId: dto.studentUserProfileId,
        classId: dto.classId,
        paymentSource,
        monthYear: dto.monthYear,
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
    }

    throw new Error('Invalid charge type');
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

    // If no monthly subscription, check if they paid for this specific session
    if (sessionId) {
      return this.hasPaidForSession(studentUserProfileId, sessionId);
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
   * Check if student has paid for a specific session
   */
  async hasPaidForSession(
    studentUserProfileId: string,
    sessionId: string,
  ): Promise<boolean> {
    const charge = await this.sessionChargeRepo.findPaidSessionCharge(
      studentUserProfileId,
      sessionId,
    );
    return !!charge;
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
