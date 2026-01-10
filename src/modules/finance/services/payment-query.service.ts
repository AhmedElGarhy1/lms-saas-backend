import { Injectable } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { Payment } from '../entities/payment.entity';
import { PaginatePaymentDto } from '../dto/paginate-payment.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { UserPaymentStatementItemDto } from '../dto/payment-statement.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class PaymentQueryService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment> {
    return await this.paymentRepository.findOneOrThrow(paymentId);
  }

  /**
   * Find payment by correlation ID
   */
  async findByCorrelationId(correlationId: string): Promise<Payment[]> {
    return await this.paymentRepository.findByCorrelationId(correlationId);
  }

  /**
   * Get paginated payments for a specific user
   */
  async getUserPaymentsPaginated(
    userProfileId: string,
    paginateDto: PaginatePaymentDto,
  ): Promise<Pagination<UserPaymentStatementItemDto>> {
    return await this.paymentRepository.getPaymentsPaginated(
      paginateDto,
      undefined,
      {
        userId: userProfileId,
        includeAll: false,
      },
    );
  }

  /**
   * Get all payments paginated (admin function)
   */
  async getAllPaymentsPaginated(
    paginateDto: PaginatePaymentDto,
    actor: ActorUser,
  ): Promise<Pagination<UserPaymentStatementItemDto>> {
    return await this.paymentRepository.getPaymentsPaginated(
      paginateDto,
      actor,
      {
        includeAll: true,
      },
    );
  }
}
