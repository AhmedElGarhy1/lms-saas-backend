import { Injectable } from '@nestjs/common';
import { Payment } from '../entities/payment.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
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
  senderUserId?: string;
  receiverUserId?: string;
};

@Injectable()
export class PaymentRepository extends BaseRepository<Payment> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
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
   * Get user payments statement with enhanced data including names - query-based pagination
   */
  async getUserPaymentsPaginated(
    userId: string,
    dto: PaginatePaymentDto,
    centerId?: string,
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
        'branches',
        'receiverBranch',
        'p.receiverId = receiverBranch.id AND p.receiverType = :branchType',
        { branchType: 'BRANCH' },
      )
      // Filter for payments where user is either sender or receiver
      .where(
        '(senderProfile.userId = :userId OR receiverProfile.userId = :userId)',
        { userId },
      )
      // Filter by center if provided
      .andWhere(
        centerId
          ? '(senderBranch.centerId = :centerId OR receiverBranch.centerId = :centerId)'
          : '1=1',
        centerId ? { centerId } : {},
      )
      // Select human-readable names and user IDs
      .addSelect('senderUser.name', 'senderName')
      .addSelect('senderUser.id', 'senderUserId')
      .addSelect('receiverUser.name', 'receiverName')
      .addSelect('receiverUser.id', 'receiverUserId')
      .setParameters({
        userId,
        userProfileType: 'USER_PROFILE',
        branchType: 'BRANCH',
        ...(centerId && { centerId }),
      });

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
            senderUserId: raw.senderUserId,
            receiverUserId: raw.receiverUserId,
          } as PaymentWithNames;
        },
      },
    )) as Pagination<PaymentWithNames>;

    // Transform to UserPaymentStatementItemDto
    const items: UserPaymentStatementItemDto[] = result.items.map(
      (payment: PaymentWithNames) => {
        // Determine user's role in the payment by checking which user ID matches
        const userRole: 'sender' | 'receiver' =
          payment.senderUserId === userId ? 'sender' : 'receiver';

        return {
          id: payment.id,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          amount: payment.amount.toNumber(),
          status: payment.status,
          reason: payment.reason,
          source: payment.source,
          senderId: payment.senderId,
          receiverId: payment.receiverId,
          correlationId: payment.correlationId,
          paidAt: payment.paidAt,
          senderName: payment.senderName,
          receiverName: payment.receiverName,
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
   * Get all payments with enhanced data including names (for admin view)
   */
  async getAllPaymentsPaginated(
    dto: PaginatePaymentDto,
    actor: ActorUser,
  ): Promise<Pagination<UserPaymentStatementItemDto>> {
    // Build query with joins to get payment and user name information
    const queryBuilder = this.getRepository()
      .manager.createQueryBuilder(Payment, 'p')
      // Join for sender names (users)
      .leftJoin(
        'user_profiles',
        'senderProfile',
        'p.senderId = senderProfile.id AND p.senderType = :userProfileType',
      )
      .leftJoin('users', 'senderUser', 'senderProfile.userId = senderUser.id')
      // Join for receiver names (users)
      .leftJoin(
        'user_profiles',
        'receiverProfile',
        'p.receiverId = receiverProfile.id AND p.receiverType = :userProfileType',
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
      )
      .leftJoin(
        'branches',
        'receiverBranch',
        'p.receiverId = receiverBranch.id AND p.receiverType = :branchType',
      )
      // Select human-readable names and user IDs
      .addSelect('senderUser.name', 'senderName')
      .addSelect('senderUser.id', 'senderUserId')
      .addSelect('receiverUser.name', 'receiverName')
      .addSelect('receiverUser.id', 'receiverUserId')
      .setParameters({
        userProfileType: WalletOwnerType.USER_PROFILE,
        branchType: WalletOwnerType.BRANCH,
      });

    // Filter by center if actor has centerId
    if (actor?.centerId) {
      queryBuilder.andWhere(
        '(senderBranch.centerId = :centerId OR receiverBranch.centerId = :centerId)',
        { centerId: actor.centerId },
      );
    }

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
            senderUserId: raw.senderUserId,
            receiverUserId: raw.receiverUserId,
          } as PaymentWithNames;
        },
      },
    )) as Pagination<PaymentWithNames>;

    // Transform to UserPaymentStatementItemDto
    // For admin view, userRole is not meaningful since it's not user-specific
    const items: UserPaymentStatementItemDto[] = result.items.map(
      (payment: PaymentWithNames) => ({
        id: payment.id,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        amount: payment.amount.toNumber(),
        status: payment.status,
        reason: payment.reason,
        source: payment.source,
        senderId: payment.senderId,
        receiverId: payment.receiverId,
        correlationId: payment.correlationId,
        paidAt: payment.paidAt,
        senderName: payment.senderName || 'N/A',
        receiverName: payment.receiverName || 'N/A',
        userRole: 'sender', // Default for admin view, or could be determined differently
      }),
    );

    return {
      ...result,
      items,
    };
  }
}
