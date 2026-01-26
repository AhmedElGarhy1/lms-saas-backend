import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { StudentCharge } from '../entities/student-charge.entity';
import { StudentChargeType, StudentChargeStatus } from '../enums';
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
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';
import { PaymentReferenceType } from '@/modules/finance/enums/payment-reference-type.enum';
import { WalletOwnerType } from '@/modules/finance/enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { ClassesService } from '@/modules/classes/services/classes.service';
import { ClassesRepository } from '@/modules/classes/repositories/classes.repository';
import { PaymentStrategyService } from '@/modules/classes/services/payment-strategy.service';
import { SessionsRepository } from '@/modules/sessions/repositories/sessions.repository';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassAccessService } from '@/modules/classes/services/class-access.service';
import { StudentChargesRepository } from '../repositories/student-charges.repository';
import { BaseService } from '@/shared/common/services/base.service';
import { StudentBillingErrors } from '../exceptions/student-billing.errors';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ClassesErrors } from '@/modules/classes/exceptions/classes.errors';
import { SessionsErrors } from '@/modules/sessions/exceptions/sessions.errors';
import { Class } from '@/modules/classes/entities/class.entity';
import { StudentBillingValidationService } from './student-billing-validation.service';
import {
  StudentBillingQueryService,
  StudentBillingSummary,
} from './student-billing-query.service';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { StudentBillingEvents } from '@/shared/events/student-billing.events.enum';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { UserProfileErrors } from '@/modules/user-profile/exceptions/user-profile.errors';
import { CentersErrors } from '@/modules/centers/exceptions/centers.errors';
import {
  StudentChargeCreatedEvent,
  StudentChargeCompletedEvent,
  StudentChargeInstallmentPaidEvent,
} from '../events/student-billing.events';

@Injectable()
export class StudentBillingService extends BaseService {
  constructor(
    private chargesRepository: StudentChargesRepository,
    private classesRepository: ClassesRepository,
    private paymentService: PaymentService,
    private classesService: ClassesService,
    private paymentStrategyService: PaymentStrategyService,
    private sessionsRepository: SessionsRepository,
    private branchAccessService: BranchAccessService,
    private classAccessService: ClassAccessService,
    private accessControlHelperService: AccessControlHelperService,
    private validationService: StudentBillingValidationService,
    private queryService: StudentBillingQueryService,
    private typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly userProfileService: UserProfileService,
  ) {
    super();
  }

  /**
   * Validate that monthly subscriptions are allowed for this class
   * Delegates to validation service
   */
  async validateMonthlySubscriptionAllowed(classId: string): Promise<void> {
    return this.validationService.validateMonthlySubscriptionAllowed(classId);
  }

  /**
   * Validate that session charges are allowed for this class
   * Delegates to validation service
   */
  async validateSessionChargeAllowed(classId: string): Promise<void> {
    return this.validationService.validateSessionChargeAllowed(classId);
  }

  /**
   * Get validated payment price for a class
   * Delegates to validation service
   */
  async getValidatedPaymentPrice(
    classId: string,
    paymentType: 'session' | 'month',
  ): Promise<number> {
    return this.validationService.getValidatedPaymentPrice(
      classId,
      paymentType,
    );
  }

  /**
   * Validate that class charges are allowed for this class
   * Delegates to validation service
   */
  async validateClassChargeAllowed(classId: string): Promise<void> {
    return this.validationService.validateClassChargeAllowed(classId);
  }

  /**
   * Get validated class charge price for a class
   * Delegates to validation service
   */
  async getValidatedClassPrice(classId: string): Promise<number> {
    return this.validationService.getValidatedClassPrice(classId);
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
   * Validate class access for actor (branch and class access)
   * Extracted to eliminate duplication across multiple methods
   */
  private async validateClassAccessForActor(
    classId: string,
    actor: ActorUser,
  ): Promise<Class> {
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

    return classEntity;
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
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.chargesRepository.findByIdempotencyKey(
        dto.idempotencyKey,
        dto.studentUserProfileId,
      );
      if (existing) {
        return existing;
      }
    }

    // Validate student is active
    const student = await this.userProfileService.findOne(
      dto.studentUserProfileId,
    );
    if (!student) {
      throw UserProfileErrors.userProfileNotFound();
    }
    if (!student.isActive) {
      throw UserProfileErrors.userProfileInactive();
    }

    // ✅ VALIDATE: Access control for staff users
    const classEntity = await this.validateClassAccessForActor(
      dto.classId,
      actor,
    );

    // Validate related entities are active
    const classWithRelations =
      await this.classesRepository.findClassWithRelationsOrThrow(dto.classId);
    if (classWithRelations.center && !classWithRelations.center.isActive) {
      throw CentersErrors.centerInactive();
    }
    if (classWithRelations.branch && !classWithRelations.branch.isActive) {
      throw CentersErrors.branchInactive();
    }

    // ✅ VALIDATE: Check if monthly subscriptions are allowed
    await this.validateMonthlySubscriptionAllowed(dto.classId);

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

    // Create the charge record first (in PENDING status)
    const charge = await this.chargesRepository.createCharge({
      idempotencyKey: dto.idempotencyKey,
      studentUserProfileId: dto.studentUserProfileId,
      chargeType: StudentChargeType.SUBSCRIPTION,
      centerId: classEntity.centerId,
      branchId: classEntity.branchId,
      classId: dto.classId,
      month: dto.month,
      year: dto.year,
      amount,
      status: StudentChargeStatus.PENDING, // Start as pending
    });

    // Execute payment using unified API with charge reference
    const paymentRequest: ExecutePaymentRequest = {
      amount: Money.from(amount),
      senderId: dto.studentUserProfileId,
      senderType: WalletOwnerType.USER_PROFILE,
      receiverId: classEntity.branchId,
      receiverType: WalletOwnerType.BRANCH,
      reason: PaymentReason.MONTHLY_FEE,
      paymentMethod:
        dto.paymentMethod === PaymentMethod.WALLET
          ? PaymentMethod.WALLET
          : PaymentMethod.CASH,
      referenceType: PaymentReferenceType.STUDENT_CHARGE,
      referenceId: charge.id, // Now we have the charge ID
    };

    const paymentResult = await this.paymentService.createAndExecutePayment(
      paymentRequest,
      actor,
    );
    const payment = paymentResult.payment;

    // Update charge status to COMPLETED after successful payment
    charge.status = StudentChargeStatus.COMPLETED;
    charge.totalPaid = amount;
    charge.lastPaymentAmount = amount;

    const savedCharge = await this.chargesRepository.saveCharge(charge);

    // Emit events
    await this.typeSafeEventEmitter.emitAsync(
      StudentBillingEvents.CHARGE_CREATED,
      new StudentChargeCreatedEvent(actor, savedCharge, Money.from(amount)),
    );
    await this.typeSafeEventEmitter.emitAsync(
      StudentBillingEvents.CHARGE_COMPLETED,
      new StudentChargeCompletedEvent(actor, savedCharge, Money.from(amount)),
    );

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
    paymentMethod: PaymentMethod,
    actor: ActorUser,
  ): Promise<StudentCharge> {
    // ✅ VALIDATE: Access control for staff users
    const classEntity = await this.validateClassAccessForActor(classId, actor);

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
      paymentMethod:
        paymentMethod === PaymentMethod.WALLET
          ? PaymentMethod.WALLET
          : PaymentMethod.CASH,
      referenceType: PaymentReferenceType.STUDENT_CHARGE,
      referenceId: classCharge.id,
    };

    const paymentResult = await this.paymentService.createAndExecutePayment(
      paymentRequest,
      actor,
    );
    const payment = paymentResult.payment;

    // Update charge with new payment
    classCharge.totalPaid = newTotalPaid.toNumber();
    classCharge.lastPaymentAmount = installmentAmount;
    classCharge.updatedAt = new Date();

    // Check if fully paid
    const wasCompleted = newTotalPaid.equals(Money.from(classCharge.amount));
    if (wasCompleted) {
      classCharge.status = StudentChargeStatus.COMPLETED;
    }

    const savedCharge = await this.chargesRepository.saveCharge(classCharge);

    // Emit installment paid event
    const remainingAmount = Money.from(classCharge.amount).subtract(
      newTotalPaid,
    );
    await this.typeSafeEventEmitter.emitAsync(
      StudentBillingEvents.INSTALLMENT_PAID,
      new StudentChargeInstallmentPaidEvent(
        actor,
        savedCharge,
        Money.from(installmentAmount),
        remainingAmount,
      ),
    );

    // Emit completed event if fully paid
    if (wasCompleted) {
      await this.typeSafeEventEmitter.emitAsync(
        StudentBillingEvents.CHARGE_COMPLETED,
        new StudentChargeCompletedEvent(actor, savedCharge, newTotalPaid),
      );
    }

    return savedCharge;
  }

  /**
   * Get class charge progress for a student
   * Delegates to query service
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
    return this.queryService.getClassChargeProgress(
      studentUserProfileId,
      classId,
      actor,
    );
  }

  /**
   * Get student billing summary for all charges
   * Delegates to query service
   */
  async getStudentBillingSummary(
    studentUserProfileId: string,
    actor: ActorUser,
  ): Promise<StudentBillingSummary> {
    return this.queryService.getStudentBillingSummary(
      studentUserProfileId,
      actor,
    );
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

    // Validate student is active
    const student = await this.userProfileService.findOne(
      dto.studentUserProfileId,
    );
    if (!student) {
      throw UserProfileErrors.userProfileNotFound();
    }
    if (!student.isActive) {
      throw UserProfileErrors.userProfileInactive();
    }

    // Get class with relations to validate related entities
    const classEntity = await this.classesService.findOneOrThrow(classId);
    const classWithRelations =
      await this.classesRepository.findClassWithRelationsOrThrow(classId);

    // Validate center is active
    if (classWithRelations.center && !classWithRelations.center.isActive) {
      throw CentersErrors.centerInactive();
    }

    // Validate branch is active
    if (classWithRelations.branch && !classWithRelations.branch.isActive) {
      throw CentersErrors.branchInactive();
    }

    // ✅ VALIDATE: Access control for staff users
    await this.validateClassAccessForActor(classId, actor);

    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.chargesRepository.findByIdempotencyKey(
        dto.idempotencyKey,
        dto.studentUserProfileId,
      );
      if (existing) {
        return existing;
      }
    }

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

    // Create the charge record first (in PENDING status)
    const charge = await this.chargesRepository.createCharge({
      idempotencyKey: dto.idempotencyKey,
      studentUserProfileId: dto.studentUserProfileId,
      chargeType: StudentChargeType.SESSION,
      centerId: session.centerId,
      branchId: session.branchId,
      classId,
      sessionId: dto.sessionId,
      amount,
      status: StudentChargeStatus.PENDING, // Start as pending
    });

    // Execute payment using unified API with charge reference
    const paymentRequest: ExecutePaymentRequest = {
      amount: Money.from(amount),
      senderId: dto.studentUserProfileId,
      senderType: WalletOwnerType.USER_PROFILE,
      receiverId: session.branchId,
      receiverType: WalletOwnerType.BRANCH,
      reason: PaymentReason.SESSION_FEE,
      paymentMethod:
        dto.paymentMethod === PaymentMethod.WALLET
          ? PaymentMethod.WALLET
          : PaymentMethod.CASH,
      referenceType: PaymentReferenceType.STUDENT_CHARGE,
      referenceId: charge.id, // Now we have the charge ID
    };

    const paymentResult = await this.paymentService.createAndExecutePayment(
      paymentRequest,
      actor,
    );
    const payment = paymentResult.payment;

    // Update charge status to COMPLETED after successful payment
    charge.status = StudentChargeStatus.COMPLETED;
    charge.totalPaid = amount;
    charge.lastPaymentAmount = amount;

    const savedCharge = await this.chargesRepository.saveCharge(charge);

    // Emit events
    await this.typeSafeEventEmitter.emitAsync(
      StudentBillingEvents.CHARGE_CREATED,
      new StudentChargeCreatedEvent(actor, savedCharge, Money.from(amount)),
    );
    await this.typeSafeEventEmitter.emitAsync(
      StudentBillingEvents.CHARGE_COMPLETED,
      new StudentChargeCompletedEvent(actor, savedCharge, Money.from(amount)),
    );

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
    // Validate student is active
    const student = await this.userProfileService.findOne(
      dto.studentUserProfileId,
    );
    if (!student) {
      throw UserProfileErrors.userProfileNotFound();
    }
    if (!student.isActive) {
      throw UserProfileErrors.userProfileInactive();
    }

    // ✅ VALIDATE: Access control for staff users
    const classEntity = await this.validateClassAccessForActor(
      dto.classId,
      actor,
    );

    // Validate related entities are active
    const classWithRelations =
      await this.classesRepository.findClassWithRelationsOrThrow(dto.classId);
    if (classWithRelations.center && !classWithRelations.center.isActive) {
      throw CentersErrors.centerInactive();
    }
    if (classWithRelations.branch && !classWithRelations.branch.isActive) {
      throw CentersErrors.branchInactive();
    }

    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.chargesRepository.findByIdempotencyKey(
        dto.idempotencyKey,
        dto.studentUserProfileId,
      );
      if (existing) {
        return existing;
      }
    }

    // ✅ VALIDATE: Check if class charges are allowed
    await this.validateClassChargeAllowed(dto.classId);

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

    // Determine initial status - COMPLETED if fully paid, INSTALLMENT if partial
    const isFullyPaid = Money.from(initialPaymentAmount).equals(
      Money.from(totalAmount),
    );
    const initialStatus = isFullyPaid
      ? StudentChargeStatus.COMPLETED
      : StudentChargeStatus.INSTALLMENT;

    // Create the charge record first
    const charge = await this.chargesRepository.createCharge({
      idempotencyKey: dto.idempotencyKey,
      studentUserProfileId: dto.studentUserProfileId,
      chargeType: StudentChargeType.CLASS,
      centerId: classEntity.centerId,
      branchId: classEntity.branchId,
      classId: dto.classId,
      amount: totalAmount, // Total class cost
      totalPaid: initialPaymentAmount, // Initial payment made
      lastPaymentAmount: initialPaymentAmount, // Initial payment amount
      status: initialStatus, // COMPLETED if fully paid, INSTALLMENT if partial
    });

    // Execute payment using unified API with charge reference
    const paymentRequest: ExecutePaymentRequest = {
      amount: Money.from(initialPaymentAmount),
      senderId: dto.studentUserProfileId,
      senderType: WalletOwnerType.USER_PROFILE,
      receiverId: classEntity.branchId,
      receiverType: WalletOwnerType.BRANCH,
      reason: PaymentReason.CLASS_FEE,
      paymentMethod:
        dto.paymentMethod === PaymentMethod.WALLET
          ? PaymentMethod.WALLET
          : PaymentMethod.CASH,
      referenceType: PaymentReferenceType.STUDENT_CHARGE,
      referenceId: charge.id, // Now we have the charge ID
    };

    const paymentResult = await this.paymentService.createAndExecutePayment(
      paymentRequest,
      actor,
    );
    const payment = paymentResult.payment;

    const savedCharge = await this.chargesRepository.saveCharge(charge);

    // Emit events
    await this.typeSafeEventEmitter.emitAsync(
      StudentBillingEvents.CHARGE_CREATED,
      new StudentChargeCreatedEvent(
        actor,
        savedCharge,
        Money.from(initialPaymentAmount),
      ),
    );

    // Emit completed event if fully paid
    if (savedCharge.status === StudentChargeStatus.COMPLETED) {
      await this.typeSafeEventEmitter.emitAsync(
        StudentBillingEvents.CHARGE_COMPLETED,
        new StudentChargeCompletedEvent(
          actor,
          savedCharge,
          Money.from(initialPaymentAmount),
        ),
      );
    }

    return savedCharge;
  }

  /**
   * Create a student charge (subscription or session) with specified payment source
   */
  @Transactional()
  async createStudentCharge(
    dto: CreateStudentChargeDto,
    paymentMethod: PaymentMethod,
    actor: ActorUser,
  ): Promise<StudentCharge> {
    // Validate access based on charge type
    if (dto.type === ChargeType.SUBSCRIPTION) {
      if (!dto.classId) {
        throw ClassesErrors.classIdRequired();
      }

      // Validate class access for staff users
      await this.validateClassAccessForActor(dto.classId, actor);
    } else if (dto.type === ChargeType.SESSION) {
      if (!dto.sessionId) {
        throw SessionsErrors.sessionIdRequired();
      }

      // Session access validation will be handled by the session service
    }

    if (dto.type === ChargeType.SUBSCRIPTION) {
      if (!dto.classId || dto.year === undefined || dto.month === undefined) {
        throw ClassesErrors.classIdRequired();
      }

      const subscriptionDto: CreateMonthlySubscriptionDto = {
        studentUserProfileId: dto.studentUserProfileId,
        classId: dto.classId,
        paymentMethod,
        year: dto.year,
        month: dto.month,
        idempotencyKey: dto.idempotencyKey,
      };

      return this.createMonthlySubscription(subscriptionDto, actor);
    } else if (dto.type === ChargeType.SESSION) {
      if (!dto.sessionId) {
        throw SessionsErrors.sessionIdRequired();
      }

      const chargeDto: CreateSessionChargeDto = {
        studentUserProfileId: dto.studentUserProfileId,
        sessionId: dto.sessionId,
        paymentMethod,
        idempotencyKey: dto.idempotencyKey,
      };

      return this.createSessionCharge(chargeDto, actor);
    } else if (dto.type === ChargeType.CLASS) {
      if (!dto.classId) {
        throw ClassesErrors.classIdRequired();
      }

      const chargeDto: CreateClassChargeDto = {
        studentUserProfileId: dto.studentUserProfileId,
        classId: dto.classId,
        paymentMethod,
        initialPaymentAmount: dto.initialPaymentAmount!,
        idempotencyKey: dto.idempotencyKey,
      };

      return this.createClassCharge(chargeDto, actor);
    }

    throw StudentBillingErrors.invalidChargeType();
  }

  /**
   * Get payment strategy for a class (used by attendance module for detailed error messages)
   * Delegates to query service
   */
  async getClassPaymentStrategy(classId: string) {
    return this.queryService.getClassPaymentStrategy(classId);
  }

  /**
   * Check if a student is allowed to attend a class/session
   * This is the core method called by SessionsService.checkIn()
   * Delegates to query service
   */
  async checkStudentAccess(
    studentUserProfileId: string,
    classId: string,
    sessionId?: string,
  ): Promise<boolean> {
    return this.queryService.checkStudentAccess(
      studentUserProfileId,
      classId,
      sessionId,
    );
  }

  /**
   * Get active monthly subscription for a student in a class
   * Delegates to query service
   */
  async getActiveSubscription(
    studentUserProfileId: string,
    classId: string,
  ): Promise<StudentCharge | null> {
    return this.queryService.getActiveSubscription(
      studentUserProfileId,
      classId,
    );
  }

  /**
   * Check if student has paid for session access under a strategy
   * Delegates to query service
   */
  async hasPaidForSessionAccess(
    studentUserProfileId: string,
    sessionId: string,
  ): Promise<boolean> {
    return this.queryService.hasPaidForSessionAccess(
      studentUserProfileId,
      sessionId,
    );
  }

  /**
   * Get student charges with pagination and filtering
   */
  async getStudentBillingRecords(
    paginateDto: PaginateStudentBillingRecordsDto,
    actor: ActorUser,
  ): Promise<Pagination<StudentCharge>> {
    if (!actor.centerId) {
      throw CentersErrors.centerIdRequired();
    }

    // Center access is validated at guard level, additional validation here ensures data integrity
    // For center-wide billing access, no specific branch/class validation needed

    return this.chargesRepository.getPaginatedChargesForCenter(
      paginateDto,
      actor,
    );
  }

  async getStudentBillingRecordById(
    id: string,
    actor: ActorUser,
  ): Promise<StudentCharge> {
    const charge =
      await this.chargesRepository.findStudentChargeWithRelations(id);

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
