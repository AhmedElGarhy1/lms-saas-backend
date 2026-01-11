import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Transactional } from '@nestjs-cls/transactional';
import { StudentCharge } from '../entities/student-charge.entity';
import {
  StudentChargeType,
  StudentChargeStatus,
  PaymentSource,
} from '../enums';
import { CreateMonthlySubscriptionDto } from '../dto/create-monthly-subscription.dto';
import { CreateSessionChargeDto } from '../dto/create-session-charge.dto';
import { CreateClassChargeDto } from '../dto/create-class-charge.dto';
import {
  CreateStudentChargeDto,
  ChargeType,
} from '../dto/create-student-charge.dto';
import { PaginateStudentBillingRecordsDto } from '../dto/paginate-student-billing-records.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import {
  PaymentService,
  ExecutePaymentRequest,
} from '@/modules/finance/services/payment.service';
import { PaymentReason } from '@/modules/finance/enums/payment-reason.enum';
import { PaymentMethod as FinancePaymentMethod } from '@/modules/finance/enums/payment-method.enum';
import { WalletOwnerType } from '@/modules/finance/enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { ClassesService } from '@/modules/classes/services/classes.service';
import { PaymentStrategyService } from '@/modules/classes/services/payment-strategy.service';
import { SessionsRepository } from '@/modules/sessions/repositories/sessions.repository';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassAccessService } from '@/modules/classes/services/class-access.service';
import { StudentChargesRepository } from '../repositories/student-charges.repository';
import { BaseService } from '@/shared/common/services/base.service';
import { StudentBillingErrors } from '../exceptions/student-billing.errors';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';

@Injectable()
export class StudentBillingService extends BaseService {
  constructor(
    private chargesRepository: StudentChargesRepository,
    private paymentService: PaymentService,
    private classesService: ClassesService,
    private paymentStrategyService: PaymentStrategyService,
    private sessionsRepository: SessionsRepository,
    private branchAccessService: BranchAccessService,
    private classAccessService: ClassAccessService,
    private accessControlHelperService: AccessControlHelperService,
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
    const activeCharge =
      await this.chargesRepository.findActiveClassChargeByStudentAndClass(
        studentUserProfileId,
        classId,
      );
    return !!activeCharge;
  }

  /**
   * Create a monthly subscription for a student
   * Handles payment processing and billing record creation
   */
  @Transactional()
  async createMonthlySubscription(
    dto: CreateMonthlySubscriptionDto,
    actor: ActorUser,
  ): Promise<StudentCharge> {
    // ✅ VALIDATE: Access control for staff users
    if (actor) {
      const classEntity = await this.classesService.findOneOrThrow(dto.classId);
      await this.branchAccessService.validateBranchAccess({
        userProfileId: actor.userProfileId,
        centerId: actor.centerId!,
        branchId: classEntity.branchId,
      });
      await this.classAccessService.validateClassAccess({
        userProfileId: actor.userProfileId,
        classId: dto.classId,
      });
    }

    // ✅ VALIDATE: Check if monthly subscriptions are allowed
    await this.validateMonthlySubscriptionAllowed(dto.classId);

    // Get class information
    const classEntity = await this.classesService.findOneOrThrow(dto.classId);

    // ✅ GET PRICE: Use validated class-configured price
    const amount = await this.getValidatedPaymentPrice(dto.classId, 'month');

    // Check for duplicate subscription for the same month
    const existingSubscription =
      await this.chargesRepository.findActiveMonthlySubscription(
        dto.studentUserProfileId,
        dto.classId,
        dto.month,
        dto.year,
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
      reason: PaymentReason.MONTHLY_FEE,
      source:
        dto.paymentSource === PaymentSource.WALLET
          ? FinancePaymentMethod.WALLET
          : FinancePaymentMethod.CASH,
      correlationId: randomUUID(),
    };

    const paymentResult = await this.paymentService.createAndExecutePayment(
      paymentRequest,
      actor,
    );
    const payment = paymentResult.payment;

    // Get payment strategy for billing record
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        dto.classId,
      );

    // Create unified monthly charge
    const savedCharge = await this.chargesRepository.createCharge({
      studentUserProfileId: dto.studentUserProfileId,
      chargeType: StudentChargeType.SUBSCRIPTION,
      centerId: classEntity.centerId,
      branchId: classEntity.branchId,
      classId: dto.classId,
      month: dto.month,
      year: dto.year,
      amount,
      paymentSource: dto.paymentSource,
      paymentId: payment.id,
      status: StudentChargeStatus.COMPLETED,
    });

    return savedCharge;
  }

  /**
   * Pay an installment for an existing class charge
   * Handles additional payments towards a class charge
   */
  @Transactional()
  async payClassInstallment(
    classId: string,
    studentUserProfileId: string,
    installmentAmount: number,
    paymentSource: PaymentSource,
    actor: ActorUser,
  ): Promise<StudentCharge> {
    // ✅ VALIDATE: Access control for staff users
    const classEntity = await this.classesService.findOneOrThrow(classId);
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: classEntity.branchId,
    });
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId,
    });

    // Find existing class charge
    const classCharge =
      await this.chargesRepository.findActiveClassChargeByStudentAndClass(
        studentUserProfileId,
        classId,
      );

    if (!classCharge) {
      throw StudentBillingErrors.classChargeNotFound();
    }

    if (classCharge.status === StudentChargeStatus.COMPLETED) {
      throw StudentBillingErrors.classAlreadyFullyPaid();
    }

    if (classCharge.status !== StudentChargeStatus.INSTALLMENT) {
      throw StudentBillingErrors.invalidChargeStatus();
    }

    // Calculate new total paid
    const newTotalPaid = Money.from(classCharge.totalPaid).add(
      Money.from(installmentAmount),
    );

    // Check if this payment would exceed the total amount
    if (newTotalPaid.greaterThan(Money.from(classCharge.amount))) {
      throw StudentBillingErrors.paymentExceedsTotalAmount();
    }

    // Execute payment using unified API
    const paymentRequest: ExecutePaymentRequest = {
      amount: Money.from(installmentAmount),
      senderId: studentUserProfileId,
      senderType: WalletOwnerType.USER_PROFILE,
      receiverId: classEntity.branchId,
      receiverType: WalletOwnerType.BRANCH,
      reason: PaymentReason.CLASS_FEE,
      source:
        paymentSource === PaymentSource.WALLET
          ? FinancePaymentMethod.WALLET
          : FinancePaymentMethod.CASH,
      correlationId: randomUUID(),
    };

    const paymentResult = await this.paymentService.createAndExecutePayment(
      paymentRequest,
      actor,
    );
    const payment = paymentResult.payment;

    // Update charge with new payment
    classCharge.totalPaid = newTotalPaid.toNumber();
    classCharge.lastPaymentAmount = installmentAmount;
    classCharge.paymentId = payment.id;
    classCharge.paymentSource = paymentSource;
    classCharge.updatedAt = new Date();

    // Check if fully paid
    if (newTotalPaid.equals(Money.from(classCharge.amount))) {
      classCharge.status = StudentChargeStatus.COMPLETED;
    }

    return this.chargesRepository.saveCharge(classCharge);
  }

  /**
   * Get class charge progress for a student
   */
  async getClassChargeProgress(
    studentUserProfileId: string,
    classId: string,
    actor: ActorUser,
  ): Promise<{
    totalAmount: number;
    totalPaid: number;
    remaining: number;
    progress: number;
    lastPayment?: number;
    payoutType: StudentChargeType;
    payoutStatus: StudentChargeStatus;
  }> {
    // ✅ VALIDATE: Access control for staff users
    const classEntity = await this.classesService.findOneOrThrow(classId);
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: classEntity.branchId,
    });
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId,
    });

    // Find active class charge (COMPLETED or INSTALLMENT)
    const classCharge =
      await this.chargesRepository.findActiveClassChargeByStudentAndClass(
        studentUserProfileId,
        classId,
      );

    if (!classCharge) {
      throw StudentBillingErrors.classChargeNotFound();
    }

    const totalAmount = Money.from(classCharge.amount);
    const totalPaid = Money.from(classCharge.totalPaid);
    const remaining = totalAmount.subtract(totalPaid);
    const progress = totalPaid
      .divide(totalAmount.toNumber())
      .multiply(100)
      .toNumber();

    return {
      totalAmount: totalAmount.toNumber(),
      totalPaid: totalPaid.toNumber(),
      remaining: remaining.toNumber(),
      progress: Math.round(progress * 100) / 100, // Round to 2 decimal places
      lastPayment: classCharge.lastPaymentAmount, // Match teacher format
      payoutType: classCharge.chargeType, // Match teacher format
      payoutStatus: classCharge.status, // Match teacher format
    };
  }

  /**
   * Get student billing summary for all charges
   */
  async getStudentBillingSummary(
    studentUserProfileId: string,
    actor: ActorUser,
  ): Promise<any> {
    // Get all active charges for the student
    const charges =
      await this.chargesRepository.findActiveChargesByStudent(
        studentUserProfileId,
      );

    const summary = {
      totalCharges: charges.length,
      totalAmount: Money.zero(),
      totalPaid: Money.zero(),
      totalRemaining: Money.zero(),
      overallProgress: 0,
      byType: {} as Record<string, any>,
    };

    for (const charge of charges) {
      const totalAmount = Money.from(charge.amount);
      const totalPaid = Money.from(charge.totalPaid);

      summary.totalAmount = summary.totalAmount.add(totalAmount);
      summary.totalPaid = summary.totalPaid.add(totalPaid);
      summary.totalRemaining = summary.totalRemaining.add(
        totalAmount.subtract(totalPaid).isNegative()
          ? Money.zero()
          : totalAmount.subtract(totalPaid),
      );

      // Group by charge type
      const type = charge.chargeType;
      if (!summary.byType[type]) {
        summary.byType[type] = {
          count: 0,
          totalAmount: Money.zero(),
          totalPaid: Money.zero(),
          totalRemaining: Money.zero(),
          progress: 0,
        };
      }

      summary.byType[type].count += 1;
      summary.byType[type].totalAmount =
        summary.byType[type].totalAmount.add(totalAmount);
      summary.byType[type].totalPaid =
        summary.byType[type].totalPaid.add(totalPaid);
      summary.byType[type].totalRemaining = summary.byType[
        type
      ].totalRemaining.add(
        totalAmount.subtract(totalPaid).isNegative()
          ? Money.zero()
          : totalAmount.subtract(totalPaid),
      );
    }

    // Calculate overall progress
    summary.overallProgress = summary.totalAmount.greaterThan(Money.zero())
      ? (summary.totalPaid.toNumber() / summary.totalAmount.toNumber()) * 100
      : 0;

    // Convert Money objects to numbers for response
    const response = {
      ...summary,
      totalAmount: summary.totalAmount.toNumber(),
      totalPaid: summary.totalPaid.toNumber(),
      totalRemaining: summary.totalRemaining.toNumber(),
    };

    // Calculate progress by type
    for (const type of Object.keys(summary.byType)) {
      const typeData = summary.byType[type];
      typeData.totalAmount = typeData.totalAmount.toNumber();
      typeData.totalPaid = typeData.totalPaid.toNumber();
      typeData.totalRemaining = typeData.totalRemaining.toNumber();
      typeData.progress =
        typeData.totalAmount > 0
          ? (typeData.totalPaid / typeData.totalAmount) * 100
          : 0;
    }

    return response;
  }

  /**
   * Create a session charge for a student
   * Handles payment processing and billing record creation
   */
  @Transactional()
  async createSessionCharge(
    dto: CreateSessionChargeDto,
    actor: ActorUser,
  ): Promise<StudentCharge> {
    // Get session information
    const session = await this.sessionsRepository.findOneOrThrow(dto.sessionId);
    const classId = session.classId;

    // ✅ VALIDATE: Access control for staff users
    const classEntity = await this.classesService.findOneOrThrow(classId);
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: classEntity.branchId,
    });
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: classId,
    });

    // ✅ VALIDATE: Check if session charges are allowed
    await this.validateSessionChargeAllowed(classId);

    // ✅ GET PRICE: Use validated class-configured price
    const amount = await this.getValidatedPaymentPrice(classId, 'session');

    // Check if student already paid for this session
    const existingCharge =
      await this.chargesRepository.findSessionChargeByStudentAndSession(
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
      reason: PaymentReason.SESSION_FEE,
      source:
        dto.paymentSource === PaymentSource.WALLET
          ? FinancePaymentMethod.WALLET
          : FinancePaymentMethod.CASH,
      correlationId: randomUUID(),
    };

    const paymentResult = await this.paymentService.createAndExecutePayment(
      paymentRequest,
      actor,
    );
    const payment = paymentResult.payment;

    // Get payment strategy for billing record
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    // Create unified charge
    const savedCharge = await this.chargesRepository.createCharge({
      studentUserProfileId: dto.studentUserProfileId,
      chargeType: StudentChargeType.SESSION,
      centerId: session.centerId,
      branchId: session.branchId,
      classId,
      sessionId: dto.sessionId,
      amount,
      paymentSource: dto.paymentSource,
      paymentId: payment.id,
      status: StudentChargeStatus.COMPLETED,
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
    actor: ActorUser,
  ): Promise<StudentCharge> {
    // ✅ VALIDATE: Access control for staff users
    if (actor) {
      const classEntity = await this.classesService.findOneOrThrow(dto.classId);
      await this.branchAccessService.validateBranchAccess({
        userProfileId: actor.userProfileId,
        centerId: actor.centerId!,
        branchId: classEntity.branchId,
      });
      await this.classAccessService.validateClassAccess({
        userProfileId: actor.userProfileId,
        classId: dto.classId,
      });
    }

    // ✅ VALIDATE: Check if class charges are allowed
    await this.validateClassChargeAllowed(dto.classId);

    // Get class information for branch details
    const classEntity = await this.classesService.findOneOrThrow(dto.classId);

    // ✅ GET PRICE: Use validated class-configured price
    const totalAmount = await this.getValidatedClassPrice(dto.classId);

    // Check if student already paid for this class
    const existingCharge =
      await this.chargesRepository.findActiveClassChargeByStudentAndClass(
        dto.studentUserProfileId,
        dto.classId,
      );

    if (existingCharge) {
      throw StudentBillingErrors.classChargeAlreadyExists();
    }

    // Initial payment amount is required and provided by the client
    const initialPaymentAmount = dto.initialPaymentAmount;

    // Validate initial payment doesn't exceed total amount
    if (initialPaymentAmount > totalAmount) {
      throw StudentBillingErrors.paymentExceedsTotalAmount();
    }

    // Execute payment using unified API
    const paymentRequest: ExecutePaymentRequest = {
      amount: Money.from(initialPaymentAmount),
      senderId: dto.studentUserProfileId,
      senderType: WalletOwnerType.USER_PROFILE,
      receiverId: classEntity.branchId,
      receiverType: WalletOwnerType.BRANCH,
      reason: PaymentReason.CLASS_FEE,
      source:
        dto.paymentSource === PaymentSource.WALLET
          ? FinancePaymentMethod.WALLET
          : FinancePaymentMethod.CASH,
      correlationId: randomUUID(),
    };

    const paymentResult = await this.paymentService.createAndExecutePayment(
      paymentRequest,
      actor,
    );
    const payment = paymentResult.payment;

    // Get payment strategy for billing record
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        dto.classId,
      );

    // Determine initial status - COMPLETED if fully paid, INSTALLMENT if partial
    const isFullyPaid = Money.from(initialPaymentAmount).equals(
      Money.from(totalAmount),
    );
    const initialStatus = isFullyPaid
      ? StudentChargeStatus.COMPLETED
      : StudentChargeStatus.INSTALLMENT;

    // Create unified class charge with installment tracking
    const savedCharge = await this.chargesRepository.createCharge({
      studentUserProfileId: dto.studentUserProfileId,
      chargeType: StudentChargeType.CLASS,
      centerId: classEntity.centerId,
      branchId: classEntity.branchId,
      classId: dto.classId,
      amount: totalAmount, // Total class cost
      totalPaid: initialPaymentAmount, // Initial payment made
      lastPaymentAmount: initialPaymentAmount, // Initial payment amount
      paymentSource: dto.paymentSource,
      paymentId: payment.id,
      status: initialStatus, // COMPLETED if fully paid, INSTALLMENT if partial
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
    actor: ActorUser,
  ): Promise<StudentCharge> {
    // Validate access based on charge type
    if (dto.type === ChargeType.SUBSCRIPTION) {
      if (!dto.classId) {
        throw new Error('classId is required for subscription charges');
      }

      // Validate class access for staff users
      const classEntity = await this.classesService.findOneOrThrow(dto.classId);
      await this.branchAccessService.validateBranchAccess({
        userProfileId: actor.userProfileId,
        centerId: actor.centerId!,
        branchId: classEntity.branchId,
      });
      await this.classAccessService.validateClassAccess({
        userProfileId: actor.userProfileId,
        classId: dto.classId,
      });
    } else if (dto.type === ChargeType.SESSION) {
      if (!dto.sessionId) {
        throw new Error('sessionId is required for session charges');
      }

      // Session access validation will be handled by the session service
    }

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

      return this.createMonthlySubscription(subscriptionDto, actor);
    } else if (dto.type === ChargeType.SESSION) {
      if (!dto.sessionId) {
        throw new Error('sessionId is required for session charges');
      }

      const chargeDto: CreateSessionChargeDto = {
        studentUserProfileId: dto.studentUserProfileId,
        sessionId: dto.sessionId,
        paymentSource,
      };

      return this.createSessionCharge(chargeDto, actor);
    } else if (dto.type === ChargeType.CLASS) {
      if (!dto.classId) {
        throw new Error('classId is required for class charges');
      }

      const chargeDto: CreateClassChargeDto = {
        studentUserProfileId: dto.studentUserProfileId,
        classId: dto.classId,
        paymentSource,
        initialPaymentAmount: dto.initialPaymentAmount!,
      };

      return this.createClassCharge(chargeDto, actor);
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
    // Check if class charges are enabled for this class
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (paymentStrategy?.includeMonth) {
      // First check if student has active monthly subscription for this class
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
      const currentYear = currentDate.getFullYear();

      const activeSubscription =
        await this.chargesRepository.findActiveMonthlySubscription(
          studentUserProfileId,
          classId,
          currentMonth,
          currentYear,
        );
      if (activeSubscription) {
        return true;
      }
    }

    if (paymentStrategy?.includeClass) {
      // Class charges are enabled - check if student has active class charge
      const classCharge =
        await this.chargesRepository.findActiveClassChargeByStudentAndClass(
          studentUserProfileId,
          classId,
        );
      if (classCharge) {
        return true;
      }
    }

    // Check if they paid for session access
    if (paymentStrategy?.includeSession && sessionId) {
      const sessionCharge =
        await this.chargesRepository.findSessionChargeByStudentAndSession(
          studentUserProfileId,
          sessionId,
        );
      if (sessionCharge) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get active monthly subscription for a student in a class
   */
  async getActiveSubscription(
    studentUserProfileId: string,
    classId: string,
  ): Promise<StudentCharge | null> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = currentDate.getFullYear();

    return this.chargesRepository.findActiveMonthlySubscription(
      studentUserProfileId,
      classId,
      currentMonth,
      currentYear,
    );
  }

  /**
   * Check if student has paid for session access under a strategy
   */
  async hasPaidForSessionAccess(
    studentUserProfileId: string,
    sessionId: string,
  ): Promise<boolean> {
    const charge =
      await this.chargesRepository.findSessionChargeByStudentAndSession(
        studentUserProfileId,
        sessionId,
      );
    return !!charge;
  }

  /**
   * Cancel a subscription (for refunds or other reasons)
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    const charge = await this.chargesRepository.findById(subscriptionId);

    if (!charge || charge.chargeType !== StudentChargeType.SUBSCRIPTION) {
      throw new NotFoundException('Subscription not found');
    }

    charge.status = StudentChargeStatus.CANCELLED;
    await this.chargesRepository.saveCharge(charge);
  }

  /**
   * Cancel a session charge (for refunds)
   */
  async cancelSessionCharge(chargeId: string): Promise<void> {
    const charge = await this.chargesRepository.findById(chargeId);

    if (!charge || charge.chargeType !== StudentChargeType.SESSION) {
      throw new NotFoundException('Session charge not found');
    }

    charge.status = StudentChargeStatus.CANCELLED;
    await this.chargesRepository.saveCharge(charge);
  }

  /**
   * Get student charges with pagination and filtering
   */
  async getStudentBillingRecords(
    paginateDto: PaginateStudentBillingRecordsDto,
    actor: ActorUser,
  ): Promise<Pagination<StudentCharge>> {
    if (!actor.centerId) {
      throw new Error('Center ID is required for billing access');
    }

    // Center access is validated at guard level, additional validation here ensures data integrity
    // For center-wide billing access, no specific branch/class validation needed

    return this.chargesRepository.getPaginatedChargesForCenter(
      actor.centerId,
      paginateDto,
      {
        studentUserProfileId: paginateDto.studentUserProfileId,
        chargeType: paginateDto.chargeType,
        dateFrom: paginateDto.dateFrom,
        dateTo: paginateDto.dateTo,
      },
    );
  }

  async getStudentBillingRecordById(
    id: string,
    actor: ActorUser,
  ): Promise<StudentCharge> {
    const charge = await this.chargesRepository.findById(id);

    if (!charge) {
      throw StudentBillingErrors.billingRecordNotFound();
    }

    this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: charge.centerId,
    });

    return charge;
  }
}
