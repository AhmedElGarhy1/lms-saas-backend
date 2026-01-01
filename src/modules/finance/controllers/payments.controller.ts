import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { PaymentService } from '../services/payment.service';
import { PaginatePaymentDto } from '../dto/paginate-payment.dto';
import { InitiatePaymentDto } from '../dto/initiate-payment.dto';
import { RefundPaymentDto } from '../dto/refund-payment.dto';
import { PaymentIdParamDto } from '../dto/payment-id-param.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { PaymentGatewayService } from '../adapters/payment-gateway.service';
import { RefundPaymentResponse } from '../adapters/interfaces/payment-gateway.interface';
import { Payment } from '../entities/payment.entity';
import { Pagination } from '@/shared/common/types/pagination.types';
import { Money } from '@/shared/common/utils/money.util';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { ManagerialOnly, GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { InsufficientPermissionsException } from '@/shared/common/exceptions/custom.exceptions';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('finance/payments')
@ManagerialOnly()
export class PaymentsController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async getPayment(
    @Param() params: PaymentIdParamDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Payment>> {
    const payment = await this.paymentService.getPayment(params.id);

    // @ManagerialOnly decorator at class level already ensures user is STAFF or ADMIN
    // Additional ownership check: user can view their own payments
    if (payment.senderId !== actor.userProfileId) {
      throw new InsufficientPermissionsException('Insufficient permissions');
    }

    return {
      data: payment,
      message: "Payment processed successfully",
    };
  }


  @Post(':id/refund')
  @Permissions(PERMISSIONS.FINANCE.MANAGE_FINANCE)
  @ApiOperation({
    summary: 'Refund a payment',
    description:
      'Process a refund for a completed external payment through the payment gateway',
  })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid refund request or payment not refundable',
  })
  async refundPayment(
    @Param() params: PaymentIdParamDto,
    @Body() dto: RefundPaymentDto,
    @GetUser() actor: ActorUser,
  ): Promise<
    ControllerResponse<{ payment: Payment; refund: RefundPaymentResponse }>
  > {
    const result = await this.paymentService.refundPayment(
      params.id,
      new Money(dto.amount),
      dto.reason,
    );

    return {
      data: result,
      message: 'Payment refunded successfully',
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List payments (paginated)',
    description:
      'List payments. Users can see their own payments, users with MANAGE_FINANCE permission can see all payments.',
  })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async listPayments(
    @Query() dto: PaginatePaymentDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<Payment>>> {
    // @ManagerialOnly decorator at class level already ensures user is STAFF or ADMIN
    // For listing, allow viewing all payments (managerial privilege)
    // No additional filtering needed since all users here are managerial

    const result = await this.paymentService.paginatePayments(dto);

    return ControllerResponse.success(result, 'Data retrieved successfully');
  }
}
