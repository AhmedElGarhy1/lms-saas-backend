import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { PaginatePaymentDto } from '../dto/paginate-payment.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { UserPaymentStatementItemDto } from '../dto/payment-statement.dto';
import { ManagerialOnly, GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('finance/payments')
@ManagerialOnly()
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  // @Get(':id')
  // @ApiOperation({ summary: 'Get payment by ID' })
  // @ApiParam({ name: 'id', description: 'Payment ID' })
  // @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  // async getPayment(
  //   @Param() params: PaymentIdParamDto,
  //   @GetUser() actor: ActorUser,
  // ): Promise<ControllerResponse<Payment>> {
  //   const payment = await this.paymentService.getPayment(params.id);

  //   // @ManagerialOnly decorator at class level already ensures user is STAFF or ADMIN
  //   // Additional ownership check: user can view their own payments
  //   if (payment.senderId !== actor.userProfileId) {
  //     throw FinanceErrors.paymentOwnershipRequired();
  //   }

  //   return ControllerResponse.success(payment);
  // }

  // @Post(':id/refund')
  // @Permissions(PERMISSIONS.FINANCE.MANAGE_FINANCE)
  // @ApiOperation({
  //   summary: 'Refund a payment',
  //   description:
  //     'Process a refund for a completed external payment through the payment gateway',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Refund processed successfully',
  // })
  // @ApiResponse({
  //   status: 400,
  //   description: 'Invalid refund request or payment not refundable',
  // })
  // async refundPayment(
  //   @Param() params: PaymentIdParamDto,
  //   @Body() dto: RefundPaymentDto,
  //   @GetUser() actor: ActorUser,
  // ): Promise<
  //   ControllerResponse<{ payment: Payment; refund: RefundPaymentResponse }>
  // > {
  //   const result = await this.paymentService.refundPayment(
  //     params.id,
  //     new Money(dto.amount),
  //     dto.reason,
  //   );

  //   return ControllerResponse.success(result);
  // }

  @Permissions(PERMISSIONS.FINANCE.VIEW_PAYMENTS)
  @Get()
  @ApiOperation({
    summary: 'List payments (paginated)',
    description:
      'List payments with sender/receiver names and role information. Users can see their own payments, users with MANAGE_FINANCE permission can see all payments.',
  })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async listPayments(
    @Query() dto: PaginatePaymentDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<UserPaymentStatementItemDto>>> {
    const result = await this.paymentService.paginatePayments(dto, actor);

    return ControllerResponse.success(result);
  }
}
