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
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { PaymentGatewayService } from '../adapters/payment-gateway.service';
import { PaymentGatewayType, RefundPaymentResponse } from '../adapters/interfaces/payment-gateway.interface';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Pagination } from '@/shared/common/types/pagination.types';
import { Money } from '@/shared/common/utils/money.util';
import { RequestContext } from '@/shared/common/context/request.context';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import {
  InsufficientPermissionsException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { NoContext } from '@/shared/common/decorators/no-context.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('finance/payments')
export class PaymentsController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async getPayment(
    @Param('id') id: string,
  ): Promise<ControllerResponse<Payment>> {
    const payment = await this.paymentService.getPayment(id);

    // Validate ownership (payer can view their own payments, or admin)
    const { userProfileId } = RequestContext.get();
    if (!userProfileId) {
      throw new Error('User profile ID not found in context');
    }

    const isSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(userProfileId);
    const isAdmin =
      await this.accessControlHelperService.isAdmin(userProfileId);

    if (payment.payerProfileId !== userProfileId && !isSuperAdmin && !isAdmin) {
      throw new InsufficientPermissionsException('t.messages.accessDenied');
    }

    return {
      data: payment,
      message: {
        key: 't.messages.found',
        args: { resource: 't.resources.item' },
      },
    };
  }


  @Post('initiate')
  @Permissions(PERMISSIONS.FINANCE.MANAGE_FINANCE)
  @ApiOperation({
    summary: 'Initiate external payment',
    description: 'Initiate a payment through an external payment gateway (e.g., Paymob)',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment initiated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment data or gateway error',
  })
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
  ): Promise<ControllerResponse<{ payment: Payment; checkoutUrl: string; gatewayPaymentId: string }>> {
    const { userProfileId } = RequestContext.get();
    if (!userProfileId) {
      throw new Error('User profile ID not found in context');
    }

    const result = await this.paymentService.initiateExternalPayment(
      new Money(dto.amount / 100), // Convert from cents to currency units
      userProfileId,
      dto.currency,
      dto.description,
      dto.gateway,
      dto.idempotencyKey,
    );

    return {
      data: result,
      message: {
        key: 't.messages.created',
        args: { resource: 't.resources.payment' },
      },
    };
  }

  @Post(':id/refund')
  @Permissions(PERMISSIONS.FINANCE.MANAGE_FINANCE)
  @ApiOperation({
    summary: 'Refund a payment',
    description: 'Process a refund for a completed external payment through the payment gateway',
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
    @Param('id') paymentId: string,
    @Body() dto: RefundPaymentDto,
  ): Promise<ControllerResponse<{ payment: Payment; refund: RefundPaymentResponse }>> {
    const result = await this.paymentService.refundPayment(
      paymentId,
      new Money(dto.amount),
      dto.reason,
    );

    return {
      data: result,
      message: {
        key: 't.messages.success',
        args: {},
      },
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
  ): Promise<ControllerResponse<Pagination<Payment>>> {
    const { userProfileId } = RequestContext.get();
    if (!userProfileId) {
      throw new Error('User profile ID not found in context');
    }

    const isSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(userProfileId);
    const isAdmin =
      await this.accessControlHelperService.isAdmin(userProfileId);

    const hasManageFinancePermission = isSuperAdmin || isAdmin;

    // If no MANAGE_FINANCE permission, user can only see their own payments
    if (!hasManageFinancePermission) {
      if (!dto.payerProfileId) {
        dto.payerProfileId = userProfileId;
      } else if (dto.payerProfileId !== userProfileId) {
        throw new InsufficientPermissionsException('t.messages.accessDenied');
      }
    }

    const result = await this.paymentService.paginatePayments(dto);

    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.item' },
    });
  }
}
