import { Injectable } from '@nestjs/common';
import { Payment } from '../entities/payment.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentReferenceType } from '../enums/payment-reference-type.enum';
import { SelectQueryBuilder } from 'typeorm';
import { PaginatePaymentDto } from '../dto/paginate-payment.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { UserPaymentStatementItemDto } from '../dto/payment-statement.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';

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
            '(senderBranch.id IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId AND "isActive" = true) OR receiverBranch.id IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId AND "isActive" = true))',
            { userProfileId: actor.userProfileId },
          );
        }
      }
    }

    // Select human-readable names and user IDs
    queryBuilder
      .addSelect(
        "COALESCE(senderUser.name, CONCAT(senderCenter.name, CONCAT(' - ', senderBranch.city)))",
        'senderName',
      )
      .addSelect('senderProfile.id', 'senderProfileId')
      .addSelect('senderUser.id', 'senderUserId')
      .addSelect(
        "COALESCE(receiverUser.name, CONCAT(receiverCenter.name, CONCAT(' - ', receiverBranch.city)))",
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
    if (dto.source) {
      queryBuilder.andWhere('p.source = :source', { source: dto.source });
    }

    // Get paginated results with computed fields using the repository's paginate method
    const result = (await this.paginate(
      dto,
      {
        searchableColumns: [],
        sortableColumns: ['createdAt', 'status', 'amount'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
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
          source: payment.source,
          senderId: payment.senderId,
          receiverId: payment.receiverId,
          correlationId: payment.correlationId,
          paidAt: payment.paidAt,
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
}
