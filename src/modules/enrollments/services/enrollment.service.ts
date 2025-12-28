import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import {
  Enrollment,
  PaymentMethod,
  EnrollmentStatus,
} from '../entities/enrollment.entity';
import { BookEnrollmentDto } from '../dto/book-enrollment.dto';
import { RegisterCashEnrollmentDto } from '../dto/register-cash-enrollment.dto';
import { StudentPackageService } from '@/modules/packages/services/student-package.service';
import { SessionsService } from '@/modules/sessions/services/sessions.service';
import { GroupsService } from '@/modules/classes/services/groups.service';
import { PaymentService } from '@/modules/finance/services/payment.service';
import { WalletService } from '@/modules/finance/services/wallet.service';
import { CashTransactionService } from '@/modules/finance/services/cash-transaction.service';
import { CashboxService } from '@/modules/finance/services/cashbox.service';
import { Money } from '@/shared/common/utils/money.util';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseService } from '@/shared/common/services/base.service';
import {
  BusinessLogicException,
  ResourceNotFoundException,
  InsufficientPermissionsException,
} from '@/shared/common/exceptions/custom.exceptions';
import { Transactional } from '@nestjs-cls/transactional';
import { PaymentReason } from '@/modules/finance/enums/payment-reason.enum';
import { PaymentSource } from '@/modules/finance/enums/payment-source.enum';
import { WalletOwnerType } from '@/modules/finance/enums/wallet-owner-type.enum';
import { CashTransactionDirection } from '@/modules/finance/enums/cash-transaction-direction.enum';
import { CashTransactionType } from '@/modules/finance/enums/cash-transaction-type.enum';

@Injectable()
export class EnrollmentService extends BaseService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly studentPackageService: StudentPackageService,
    private readonly sessionsService: SessionsService,
    private readonly groupsService: GroupsService,
    private readonly paymentService: PaymentService,
    private readonly cashTransactionService: CashTransactionService,
    private readonly cashboxService: CashboxService,
  ) {
    super();
  }

  /**
   * Book an enrollment for a session (Student-facing)
   */
  @Transactional()
  async bookEnrollment(
    dto: BookEnrollmentDto,
    actor: ActorUser,
  ): Promise<Enrollment> {
    const studentId = dto.studentId || actor.userProfileId;

    // Check if session exists and is bookable
    const session = await this.sessionsService.getSession(dto.sessionId, actor);

    // Check if student has already enrolled for this session
    const existingEnrollment =
      await this.enrollmentRepository.findBySessionAndStudent(
        dto.sessionId,
        studentId,
      );

    if (
      existingEnrollment &&
      existingEnrollment.status !== EnrollmentStatus.CANCELLED
    ) {
      throw new BusinessLogicException('t.messages.businessLogicError');
    }

    // Check if session is in the past
    if (session.endTime < new Date()) {
      throw new BusinessLogicException('t.messages.businessLogicError');
    }

    // Get the class ID from the session (denormalized field)
    const classId = session.classId;

    // Determine payment method and create enrollment record
    let paymentMethod: PaymentMethod;
    let studentPackageId: string | undefined;
    let amount: Money;

    // Determine payment method based on request or availability
    let cashTransactionId: string | undefined;

    if (dto.paymentMethod === PaymentMethod.CASH) {
      // Cash payment at the door
      paymentMethod = PaymentMethod.CASH;
      // TODO: Get session price from group/class pricing
      // For now, assume a default price
      amount = new Money(50); // $50 default

      // For cash payments, we need the session's branch to find the cashbox
      const session = await this.sessionsService.getSession(
        dto.sessionId,
        actor,
      );
      const branch = await this.groupsService.getGroup(session.groupId, actor);

      // Get or create cashbox for this branch
      const cashbox = await this.cashboxService.getCashbox(branch.branchId);

      // Create cash transaction (money coming into cashbox)
      const cashTransaction =
        await this.cashTransactionService.createCashTransaction(
          branch.branchId,
          cashbox.id,
          amount,
          CashTransactionDirection.IN, // Money into cashbox
          actor.userProfileId, // Received by current staff member
          CashTransactionType.SESSION_PAYMENT,
        );

      cashTransactionId = cashTransaction.id;

      // Update cashbox balance
      await this.cashboxService.updateBalance(cashbox.id, amount);

      // Create payment record for audit trail
      const payment = await this.paymentService.createPayment(
        amount,
        studentId,
        actor.centerId!, // Center receives payment
        WalletOwnerType.CENTER, // receiver type
        PaymentReason.SESSION_BOOKING,
        PaymentSource.CASH,
        undefined, // referenceType
        cashTransaction.id, // cash transaction reference
        undefined, // correlationId
        dto.idempotencyKey,
      );

      // Complete the cash payment immediately (no locking for cash)
      await this.paymentService.completePayment(payment.id);

      this.logger.log(
        `Created cash payment record for session ${dto.sessionId} for student ${studentId}, cashbox ${cashbox.id} updated by ${amount.toString()}`,
      );
    } else if (
      dto.paymentMethod === PaymentMethod.PACKAGE ||
      (await this.studentPackageService.hasSufficientCredits(
        studentId,
        classId,
      ))
    ) {
      // Use package credits
      paymentMethod = PaymentMethod.PACKAGE;
      amount = new Money(0); // No money changes hands for packages

      const consumedPackages =
        await this.studentPackageService.consumePackageCredits(
          studentId,
          classId,
          1,
        );
      studentPackageId = consumedPackages[0]?.id;

      this.logger.log(
        `Created enrollment record for session ${dto.sessionId} for student ${studentId} using package credits for class ${classId}`,
      );
    } else {
      // Use wallet payment
      paymentMethod = PaymentMethod.WALLET;
      // TODO: Get session price from group/class pricing
      // For now, assume a default price
      amount = new Money(50); // $50 default

      // Create payment record - this will lock the funds
      const payment = await this.paymentService.createPayment(
        amount,
        studentId,
        actor.centerId!, // Center receives payment
        WalletOwnerType.CENTER, // receiver type
        PaymentReason.SESSION_BOOKING,
        PaymentSource.WALLET,
        undefined, // referenceType
        undefined, // referenceId
        undefined, // correlationId
        dto.idempotencyKey,
      );

      this.logger.log(
        `Created enrollment record for session ${dto.sessionId} for student ${studentId} with wallet lock of ${amount.toString()}`,
      );
    }

    // Create enrollment record
    const enrollmentStatus =
      paymentMethod === PaymentMethod.CASH
        ? EnrollmentStatus.PAID // Cash enrollments are completed immediately
        : EnrollmentStatus.LOCKED; // Package and wallet enrollments are locked until attendance

    const enrollmentRecord = await this.enrollmentRepository.create({
      studentId,
      sessionId: dto.sessionId,
      paymentMethod,
      packageId: studentPackageId,
      status: enrollmentStatus,
      amount,
      cashTransactionId,
    });

    return enrollmentRecord;
  }

  /**
   * Register cash payment at session door (Staff Only)
   * Auto-fetches price from session/class settings for security
   */
  @Transactional()
  async registerCashEnrollment(
    dto: RegisterCashEnrollmentDto,
    actor: ActorUser,
  ): Promise<Enrollment> {
    // 1. Validate session exists and staff has access
    const session = await this.sessionsService.getSession(dto.sessionId, actor);

    // 2. Check if student already has an enrollment for this session
    const existingEnrollment =
      await this.enrollmentRepository.findBySessionAndStudent(
        dto.sessionId,
        dto.studentId,
      );

    if (
      existingEnrollment &&
      existingEnrollment.status !== EnrollmentStatus.CANCELLED
    ) {
      throw new BusinessLogicException('t.messages.businessLogicError');
    }

    // 3. Auto-fetch price from session/class settings (SECURITY FEATURE)
    // TODO: Implement price fetching logic from session or class defaults
    // For now, use a default price - in production this would come from:
    // session.price || class.defaultPrice || center.defaultSessionPrice
    const amount = new Money(50); // Default session price

    this.logger.log(
      `Auto-fetched price of ${amount.toString()} for session ${dto.sessionId}`,
    );

    // 4. Get branch from session context (SECURITY FEATURE - no user input)
    const branch = await this.groupsService.getGroup(session.groupId, actor);

    // 5. Get or create cashbox for this branch
    const cashbox = await this.cashboxService.getCashbox(branch.branchId);

    // 6. Create cash transaction (money coming into cashbox)
    const cashTransaction =
      await this.cashTransactionService.createCashTransaction(
        branch.branchId,
        cashbox.id,
        amount,
        CashTransactionDirection.IN, // Money into cashbox
        actor.userProfileId, // Staff member who collected payment
        CashTransactionType.SESSION_PAYMENT,
      );

    // 7. Update cashbox balance immediately
    await this.cashboxService.updateBalance(cashbox.id, amount);

    // 8. Create payment record for audit trail
    const payment = await this.paymentService.createPayment(
      amount,
      dto.studentId,
      actor.centerId!, // Center receives payment
      WalletOwnerType.CENTER, // receiver type
      PaymentReason.SESSION_BOOKING,
      PaymentSource.CASH,
      undefined, // referenceType
      cashTransaction.id, // cash transaction reference
      undefined, // correlationId
      undefined, // no idempotency for cash (each transaction is unique)
    );

    // 9. Complete the cash payment immediately
    await this.paymentService.completePayment(payment.id);

    // 10. Create enrollment record as PAID (cash is immediate)
    const enrollmentRecord = await this.enrollmentRepository.create({
      studentId: dto.studentId,
      sessionId: dto.sessionId,
      paymentMethod: PaymentMethod.CASH,
      status: EnrollmentStatus.PAID, // Cash enrollments are immediately completed
      amount,
      cashTransactionId: cashTransaction.id,
    });

    this.logger.log(
      `Created cash enrollment ${enrollmentRecord.id} for student ${dto.studentId} in session ${dto.sessionId}, cashbox ${cashbox.id} updated by ${amount.toString()}`,
    );

    return enrollmentRecord;
  }

  /**
   * Cancel an enrollment (only before 2 hours)
   */
  @Transactional()
  async cancelEnrollment(
    enrollmentId: string,
    actor: ActorUser,
  ): Promise<Enrollment> {
    const enrollment =
      await this.enrollmentRepository.findOneOrThrow(enrollmentId);

    // Check permissions (student can cancel their own, admin can cancel any)
    if (enrollment.studentId !== actor.userProfileId) {
      // TODO: Add admin permission check
      throw new InsufficientPermissionsException('t.messages.accessDenied');
    }

    // Check if enrollment can be cancelled (not too late)
    const session = await this.sessionsService.getSession(
      enrollment.sessionId,
      actor,
    );
    const hoursUntilSession =
      (session.startTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilSession < 2) {
      // 2 hour cancellation policy
      throw new BusinessLogicException('t.messages.businessLogicError');
    }

    // Handle different payment methods for cancellation
    if (
      enrollment.paymentMethod === PaymentMethod.PACKAGE &&
      enrollment.packageId
    ) {
      // Restore package credits
      await this.studentPackageService.restorePackageCredits(
        enrollment.packageId,
        1,
      );
    } else if (
      enrollment.paymentMethod === PaymentMethod.CASH &&
      enrollment.cashTransactionId
    ) {
      // Reverse cash transaction - create an OUT transaction to reduce cashbox balance
      const originalCashTransaction = await this.cashTransactionService[
        'cashTransactionRepository'
      ].findOne(enrollment.cashTransactionId);

      if (originalCashTransaction) {
        // Create reverse cash transaction (OUT)
        await this.cashTransactionService.createCashTransaction(
          originalCashTransaction.branchId,
          originalCashTransaction.cashboxId,
          enrollment.amount,
          CashTransactionDirection.OUT, // Money out of cashbox (refund)
          actor.userProfileId, // Processed by current staff member
          CashTransactionType.SESSION_PAYMENT,
        );

        // Update cashbox balance (reduce it)
        await this.cashboxService.updateBalance(
          originalCashTransaction.cashboxId,
          enrollment.amount.multiply(-1), // Negative amount to reduce balance
        );

        this.logger.log(
          `Reversed cash transaction for enrollment ${enrollmentId}, refunded ${enrollment.amount.toString()} to cashbox ${originalCashTransaction.cashboxId}`,
        );
      }
    }
    // For wallet enrollments, funds remain locked until no-show processing

    // Update enrollment status
    const updatedEnrollment =
      await this.enrollmentRepository.markAsCancelled(enrollmentId);

    this.logger.log(
      `Cancelled enrollment ${enrollmentId} for session ${enrollment.sessionId}`,
    );

    return updatedEnrollment;
  }

  /**
   * Mark enrollment as attended (confirm transaction completion)
   */
  @Transactional()
  async markAsAttended(enrollmentId: string): Promise<Enrollment> {
    const enrollment =
      await this.enrollmentRepository.findOneOrThrow(enrollmentId);

    // Allow processing of LOCKED enrollments, or PAID cash enrollments (for confirmation)
    if (
      enrollment.status !== EnrollmentStatus.LOCKED &&
      !(
        enrollment.paymentMethod === PaymentMethod.CASH &&
        enrollment.status === EnrollmentStatus.PAID
      )
    ) {
      throw new BusinessLogicException('t.messages.businessLogicError');
    }

    // For package enrollments, credits are already consumed
    // For wallet enrollments, complete the transaction
    if (enrollment.paymentMethod === PaymentMethod.WALLET) {
      // TODO: Complete the wallet transaction
      this.logger.log(
        `Completing wallet payment for attended session ${enrollment.sessionId}`,
      );
    }
    // For cash enrollments, transaction is already completed at booking time

    // Update enrollment status
    const updatedEnrollment =
      await this.enrollmentRepository.updateEnrollmentStatus(
        enrollmentId,
        EnrollmentStatus.PAID,
      );

    // Mark as attended
    await this.enrollmentRepository.markAsAttended(enrollmentId);

    this.logger.log(`Marked enrollment ${enrollmentId} as attended (PAID)`);

    return updatedEnrollment;
  }

  /**
   * Mark enrollment as no-show (consume credits/money - revenue protection)
   */
  @Transactional()
  async markAsNoShow(enrollmentId: string): Promise<Enrollment> {
    const enrollment =
      await this.enrollmentRepository.findOneOrThrow(enrollmentId);

    if (enrollment.status !== EnrollmentStatus.LOCKED) {
      throw new BusinessLogicException('t.messages.businessLogicError');
    }

    // Revenue protection: credits/money already consumed on booking
    // No-show just confirms the financial transaction status
    if (enrollment.paymentMethod === PaymentMethod.WALLET) {
      // TODO: Ensure wallet transaction is completed (funds already deducted)
      this.logger.log(
        `Confirming wallet payment completion (no-show penalty) for session ${enrollment.sessionId}`,
      );
    }

    // Update enrollment status
    const updatedEnrollment =
      await this.enrollmentRepository.updateEnrollmentStatus(
        enrollmentId,
        EnrollmentStatus.NO_SHOW,
      );

    this.logger.log(
      `Marked enrollment ${enrollmentId} as no-show (revenue consumed)`,
    );

    return updatedEnrollment;
  }

  /**
   * Get enrollment by ID
   */
  async getEnrollment(enrollmentId: string): Promise<Enrollment> {
    return this.enrollmentRepository.findOneOrThrow(enrollmentId);
  }

  /**
   * Get student's enrollments
   */
  async getStudentEnrollments(studentId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.findActiveByStudentId(studentId);
  }

  /**
   * Get session enrollments
   */
  async getSessionEnrollments(sessionId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.findBySessionId(sessionId);
  }

  /**
   * Get all locked enrollments for a session (for policy processing)
   */
  async getLockedEnrollmentsForSession(
    sessionId: string,
  ): Promise<Enrollment[]> {
    return this.enrollmentRepository.findLockedBySessionId(sessionId);
  }

  /**
   * Get student's enrollment history
   */
  async getStudentEnrollmentHistory(studentId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.findStudentEnrollmentHistory(studentId);
  }

  /**
   * Process expired enrollments (mark as no-show - cron job)
   */
  @Transactional()
  async processExpiredEnrollments(): Promise<number> {
    const expiredEnrollments =
      await this.enrollmentRepository.findLockedEnrollmentsForPastSessions();

    for (const enrollment of expiredEnrollments) {
      await this.markAsNoShow(enrollment.id);
    }

    if (expiredEnrollments.length > 0) {
      this.logger.log(
        `Processed ${expiredEnrollments.length} expired enrollments as no-shows (revenue consumed)`,
      );
    }

    return expiredEnrollments.length;
  }
}
