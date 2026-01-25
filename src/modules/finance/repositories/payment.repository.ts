import { Injectable } from '@nestjs/common';
import { Payment } from '../entities/payment.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentReferenceType } from '../enums/payment-reference-type.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { SelectQueryBuilder } from 'typeorm';
import { PaginatePaymentDto } from '../dto/paginate-payment.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { UserPaymentStatementItemDto } from '../dto/payment-statement.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PAYMENT_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { Money } from '@/shared/common/utils/money.util';

// Define type for payment with computed name fields
type PaymentWithNames = Payment & {
  senderName: string;
  receiverName: string;
  senderProfileId?: string;
  senderUserId?: string;
  receiverProfileId?: string;
  receiverUserId?: string;
};

@Injectable()
export class PaymentRepository extends BaseRepository<Payment> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Payment {
    return Payment;
  }

  /**
   * Find payments by status
   */
  async findByStatus(status: PaymentStatus): Promise<Payment[]> {
    return this.getRepository().find({
      where: { status },
    });
  }

  /**
   * Find payment by reference type and ID
   */
  async findByReference(
    referenceType: PaymentReferenceType,
    referenceId: string,
  ): Promise<Payment | null> {
    return this.getRepository().findOne({
      where: { referenceType, referenceId },
    });
  }

  async findByGatewayReference(
    gatewayReference: string,
  ): Promise<Payment | null> {
    // Find gateway payments and check metadata
    const payments = await this.getRepository().find({
      where: { referenceType: PaymentReferenceType.GATEWAY_PAYMENT },
    });

    return (
      payments.find(
        (payment) =>
          payment.metadata?.gatewayResponse?.gatewayPaymentId ===
          gatewayReference,
      ) || null
    );
  }

  /**
   * Find payments by correlation ID (for split payments)
   */
  async findByCorrelationId(correlationId: string): Promise<Payment[]> {
    return this.getRepository().find({
      where: { correlationId },
    });
  }

  /**
   * Find payments by idempotency key and sender ID
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
    senderId: string,
  ): Promise<Payment[]> {
    return this.getRepository().find({
      where: { idempotencyKey, senderId },
    });
  }

  /**
   * Find payment by gateway payment ID
   */
  async findByGatewayPaymentId(
    gatewayPaymentId: string,
  ): Promise<Payment | null> {
    return this.getRepository().findOne({
      where: {
        metadata: {
          gatewayPaymentId,
        },
      },
    });
  }

  /**
   * Save payment entity
   */
  async savePayment(payment: Payment): Promise<Payment> {
    return this.getRepository().save(payment);
  }


  /**
   * Create query builder for pagination
   */
  createQueryBuilder(alias: string): SelectQueryBuilder<Payment> {
    return this.getRepository().createQueryBuilder(alias);
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
  ): Promise<void> {
    await this.getRepository().update(paymentId, { status });
  }

  /**
   * Unified payments pagination method - single source of truth
   * Handles both user-specific and admin views
   */
  async getPaymentsPaginated(
    dto: PaginatePaymentDto,
    actor: ActorUser,
    includeAll: boolean,
  ): Promise<Pagination<UserPaymentStatementItemDto>> {
    // Build query with joins to get payment and user name information
    const queryBuilder = this.getRepository()
      .manager.createQueryBuilder(Payment, 'p')
      // Join for sender names (users)
      .leftJoin(
        'user_profiles',
        'senderProfile',
        'p.senderId = senderProfile.id AND p.senderType = :userProfileType',
        { userProfileType: 'USER_PROFILE' },
      )
      .leftJoin('users', 'senderUser', 'senderProfile.userId = senderUser.id')
      // Join for receiver names (users)
      .leftJoin(
        'user_profiles',
        'receiverProfile',
        'p.receiverId = receiverProfile.id AND p.receiverType = :userProfileType',
        { userProfileType: 'USER_PROFILE' },
      )
      .leftJoin(
        'users',
        'receiverUser',
        'receiverProfile.userId = receiverUser.id',
      )
      // Join for center filtering through branches
      .leftJoin(
        'branches',
        'senderBranch',
        'p.senderId = senderBranch.id AND p.senderType = :branchType',
        { branchType: 'BRANCH' },
      )
      .leftJoin(
        'centers',
        'senderCenter',
        'senderBranch.centerId = senderCenter.id',
      )
      .leftJoin(
        'branches',
        'receiverBranch',
        'p.receiverId = receiverBranch.id AND p.receiverType = :branchType',
        { branchType: 'BRANCH' },
      )
      .leftJoin(
        'centers',
        'receiverCenter',
        'receiverBranch.centerId = receiverCenter.id',
      );

    // Apply user filtering (if not admin view)
    if (!includeAll) {
      queryBuilder.where(
        '((p.senderId = :userId AND p.senderType = :userProfileType) OR (p.receiverId = :userId AND p.receiverType = :userProfileType))',
        { userId: actor.userProfileId, userProfileType: 'USER_PROFILE' },
      );
    }

    // Apply center filtering only for admin views (includeAll = true)
    // User views should show all payments regardless of center
    let centerId: string | undefined;
    if (includeAll) {
      centerId = actor.centerId;
      if (centerId) {
        queryBuilder.andWhere(
          '(senderBranch.centerId = :centerId OR receiverBranch.centerId = :centerId)',
          { centerId },
        );

        // Check if user can bypass center internal access
        const canBypass =
          await this.accessControlHelperService.bypassCenterInternalAccess(
            actor.userProfileId,
            centerId,
          );

        // Apply branch access filtering only if user cannot bypass
        if (!canBypass) {
          queryBuilder.andWhere(
            '(senderBranch.id IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId) OR receiverBranch.id IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId))',
            { userProfileId: actor.userProfileId },
          );
        }
      }
    }

    // Select human-readable names and user IDs
    queryBuilder
      .addSelect(
        "CASE WHEN p.senderType = 'SYSTEM' THEN 'System' ELSE COALESCE(senderUser.name, CONCAT(senderCenter.name, CONCAT(' - ', senderBranch.city))) END",
        'senderName',
      )
      .addSelect('senderProfile.id', 'senderProfileId')
      .addSelect('senderUser.id', 'senderUserId')
      .addSelect(
        "CASE WHEN p.receiverType = 'SYSTEM' THEN 'System' ELSE COALESCE(receiverUser.name, CONCAT(receiverCenter.name, CONCAT(' - ', receiverBranch.city))) END",
        'receiverName',
      )
      .addSelect('receiverProfile.id', 'receiverProfileId')
      .addSelect('receiverUser.id', 'receiverUserId');

    // Set parameters
    const parameters: any = {
      userProfileType: 'USER_PROFILE',
      branchType: 'BRANCH',
      ...(centerId && { centerId }),
    };
    queryBuilder.setParameters(parameters);

    // Apply filters from dto
    if (dto.status) {
      queryBuilder.andWhere('p.status = :status', { status: dto.status });
    }
    if (dto.reason) {
      queryBuilder.andWhere('p.reason = :reason', { reason: dto.reason });
    }
    if (dto.paymentMethod) {
      queryBuilder.andWhere('p.paymentMethod = :paymentMethod', {
        paymentMethod: dto.paymentMethod,
      });
    }

    // Get paginated results with computed fields using the repository's paginate method
    const result = (await this.paginate(
      dto,
      PAYMENT_PAGINATION_COLUMNS,
      '',
      queryBuilder,
      {
        includeComputedFields: true,
        computedFieldsMapper: (entity: Payment, raw: any): PaymentWithNames => {
          // Add computed name fields from joined data
          return {
            ...entity,
            senderName: raw.senderName,
            receiverName: raw.receiverName,
            senderProfileId: raw.senderProfileId,
            senderUserId: raw.senderUserId,
            receiverProfileId: raw.receiverProfileId,
            receiverUserId: raw.receiverUserId,
          } as PaymentWithNames;
        },
      },
    )) as Pagination<PaymentWithNames>;

    // Transform to UserPaymentStatementItemDto
    const items: UserPaymentStatementItemDto[] = result.items.map(
      (payment: PaymentWithNames) => {
        // Determine user's role in the payment
        let userRole: 'sender' | 'receiver' = 'sender'; // Default

        if (!includeAll) {
          // For user-specific view, determine role based on profile IDs
          if (payment.senderProfileId === actor.userProfileId) {
            userRole = 'sender';
          } else if (payment.receiverProfileId === actor.userProfileId) {
            userRole = 'receiver';
          } else {
            userRole = 'receiver'; // Default fallback
          }
        } else {
          // For admin/center views, determine role based on whether center is sending or receiving
          userRole = payment.senderType === 'BRANCH' ? 'sender' : 'receiver';
        }

        // Calculate signed amount based on user role
        const signedAmount =
          userRole === 'sender'
            ? -payment.amount.toNumber() // Negative for sent payments
            : payment.amount.toNumber(); // Positive for received payments

        return {
          id: payment.id,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          amount: payment.amount.toNumber(),
          signedAmount,
          status: payment.status,
          reason: payment.reason,
          paymentMethod: payment.paymentMethod,
          senderId: payment.senderId,
          receiverId: payment.receiverId,
          correlationId: payment.correlationId,
          paidAt: payment.paidAt,
          // 'N/A' fallback is a safety net (should rarely be needed now that SYSTEM type is handled)
          senderName: payment.senderName || 'N/A',
          receiverName: payment.receiverName || 'N/A',
          userRole,
        };
      },
    );

    return {
      ...result,
      items,
    };
  }

  /**
   * Find a payment with optimized relations loaded
   * Only loads essential fields for related entities
   *
   * @param paymentId - Payment ID
   * @param includeDeleted - Reserved for future use (Payment doesn't have soft delete)
   * @returns Payment with optimized relations
   */
  async findPaymentWithRelations(
    paymentId: string,
    includeDeleted: boolean = false,
  ): Promise<Payment | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('payment')
      // Join for sender/receiver names (same as pagination)
      .leftJoin(
        'user_profiles',
        'senderProfile',
        'payment.senderId = senderProfile.id AND payment.senderType = :userProfileType',
      )
      .leftJoin('users', 'senderUser', 'senderProfile.userId = senderUser.id')
      .leftJoin(
        'branches',
        'senderBranch',
        'payment.senderId = senderBranch.id AND payment.senderType = :branchType',
      )
      .leftJoin(
        'centers',
        'senderCenter',
        'senderBranch.centerId = senderCenter.id',
      )
      .leftJoin(
        'user_profiles',
        'receiverProfile',
        'payment.receiverId = receiverProfile.id AND payment.receiverType = :userProfileType',
      )
      .leftJoin(
        'users',
        'receiverUser',
        'receiverProfile.userId = receiverUser.id',
      )
      .leftJoin(
        'branches',
        'receiverBranch',
        'payment.receiverId = receiverBranch.id AND payment.receiverType = :branchType',
      )
      .leftJoin(
        'centers',
        'receiverCenter',
        'receiverBranch.centerId = receiverCenter.id',
      )
      // Join relations for essential fields only (not full entities)
      .leftJoin('payment.teacherPayout', 'teacherPayout')
      .leftJoin('payment.studentCharge', 'studentCharge')
      .leftJoin('teacherPayout.teacher', 'teacherProfile')
      .leftJoin('teacherProfile.user', 'teacherUser')
      .leftJoin('studentCharge.student', 'studentProfile')
      .leftJoin('studentProfile.user', 'studentUser')
      .leftJoin('studentCharge.class', 'class')
      .leftJoin('teacherPayout.class', 'teacherClass')
      // Audit relations
      .leftJoin('payment.creator', 'creator')
      .leftJoin('creator.user', 'creatorUser')
      .leftJoin('payment.updater', 'updater')
      .leftJoin('updater.user', 'updaterUser')
      // Add sender/receiver names (same as pagination)
      .addSelect(
        "CASE WHEN payment.senderType = 'SYSTEM' THEN 'System' ELSE COALESCE(senderUser.name, CONCAT(senderCenter.name, CONCAT(' - ', senderBranch.city))) END",
        'senderName',
      )
      .addSelect(
        "CASE WHEN payment.receiverType = 'SYSTEM' THEN 'System' ELSE COALESCE(receiverUser.name, CONCAT(receiverCenter.name, CONCAT(' - ', receiverBranch.city))) END",
        'receiverName',
      )
      // Add essential fields as selections (avoid Money fields to prevent transformer issues)
      .addSelect([
        'teacherPayout.id',
        'teacherPayout.unitType',
        'teacherPayout.unitPrice', // This is a number, not Money
        'teacherPayout.status',
        'teacherProfile.id',
        'teacherUser.name',
        'studentCharge.id',
        'studentCharge.chargeType',
        'studentCharge.status',
        'studentProfile.id',
        'studentProfile.code',
        'studentUser.name',
        'class.id',
        'class.name',
        'teacherClass.id',
        'teacherClass.name',
        // Audit fields
        'creator.id',
        'creatorUser.id',
        'creatorUser.name',
        'updater.id',
        'updaterUser.id',
        'updaterUser.name',
      ])
      // Set parameters for joins
      .setParameters({
        userProfileType: 'USER_PROFILE',
        branchType: 'BRANCH',
      })
      .where('payment.id = :paymentId', { paymentId });

    // Execute query and map computed fields
    const rawResult = await queryBuilder.getRawAndEntities();
    const payment = rawResult.entities[0];
    const raw = rawResult.raw[0];

    if (!payment) {
      return null;
    }

    // Add computed name fields to the payment entity (same as pagination)
    (payment as any).senderName = raw.senderName;
    (payment as any).receiverName = raw.receiverName;

    return payment;
  }

  /**
   * Find a payment with optimized relations loaded or throw if not found
   *
   * @param paymentId - Payment ID
   * @param includeDeleted - Reserved for future use (Payment doesn't have soft delete)
   * @returns Payment with optimized relations
   * @throws Payment not found error
   */
  async findPaymentWithRelationsOrThrow(
    paymentId: string,
    includeDeleted: boolean = false,
  ): Promise<Payment> {
    const payment = await this.findPaymentWithRelations(
      paymentId,
      includeDeleted,
    );
    if (!payment) {
      throw new Error(`Payment with id ${paymentId} not found`);
    }
    return payment;
  }

  async getCenterFinancialMetricsForMonth(
    centerId: string,
    year: number,
    month: number,
  ): Promise<{
    wallet: { revenue: Money; expenses: Money };
    cash: { revenue: Money; expenses: Money };
  }> {
    // Define revenue and expense payment reasons
    const revenueReasons = [
      PaymentReason.SESSION_FEE,
      PaymentReason.MONTHLY_FEE,
      PaymentReason.CLASS_FEE,
    ];

    const expenseReasons = [
      PaymentReason.TEACHER_STUDENT_PAYOUT,
      PaymentReason.TEACHER_HOUR_PAYOUT,
      PaymentReason.TEACHER_SESSION_PAYOUT,
      PaymentReason.TEACHER_MONTHLY_PAYOUT,
      PaymentReason.TEACHER_CLASS_PAYOUT,
    ];

    const result = await this.getRepository()
      .createQueryBuilder('payment')
      .leftJoin('payment.teacherPayout', 'teacherPayout')
      .leftJoin('payment.studentCharge', 'studentCharge')
      .select([
        'payment.paymentMethod as "paymentMethod"',
        'SUM(CASE WHEN payment.reason IN (:...revenueReasons) THEN payment.amount ELSE 0 END) as revenue',
        'SUM(CASE WHEN payment.reason IN (:...expenseReasons) THEN payment.amount ELSE 0 END) as expenses',
      ])
      .where(
        '(teacherPayout.centerId = :centerId OR studentCharge.centerId = :centerId)',
        { centerId },
      )
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('EXTRACT(YEAR FROM payment.createdAt) = :year', { year })
      .andWhere('EXTRACT(MONTH FROM payment.createdAt) = :month', { month })
      .setParameters({
        revenueReasons,
        expenseReasons,
      })
      .groupBy('payment.paymentMethod')
      .getRawMany();

    // Initialize results
    const metrics = {
      wallet: { revenue: new Money(0), expenses: new Money(0) },
      cash: { revenue: new Money(0), expenses: new Money(0) },
    };

    // Parse results
    for (const row of result) {
      const method = row.paymentMethod as PaymentMethod;
      const revenue = new Money(parseFloat(row.revenue) || 0);
      const expenses = new Money(parseFloat(row.expenses) || 0);

      if (method === PaymentMethod.WALLET) {
        metrics.wallet = { revenue, expenses };
      } else if (method === PaymentMethod.CASH) {
        metrics.cash = { revenue, expenses };
      }
    }

    return metrics;
  }
}
