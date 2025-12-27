import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { PaymentService } from '../services/payment.service';
import { CashDepositDto } from '../dto/cash-deposit.dto';
import { WalletTopupDto } from '../dto/wallet-topup.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { Payment } from '../entities/payment.entity';
import { Money } from '@/shared/common/utils/money.util';
import { RequestContext } from '@/shared/common/context/request.context';
import { PaymentReason } from '../enums/payment-reason.enum';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';

@ApiTags('Finance Actions')
@ApiBearerAuth()
@Controller('finance')
export class FinanceActionsController {
  constructor(private readonly paymentService: PaymentService) {}

  // @Post('cash-deposit')
  // @Permissions(PERMISSIONS.FINANCE.CASH_DEPOSIT)
  // @Transactional()
  // @ApiOperation({
  //   summary: 'Process cash deposit (student pays cash)',
  //   description:
  //     'Business event: Receptionist records cash payment from student.',
  // })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Cash deposit processed successfully',
  // })
  // async processCashDeposit(
  //   @Body() dto: CashDepositDto,
  // ): Promise<ControllerResponse<Payment>> {
  //   const ctx = RequestContext.get();
  //   if (!ctx.userProfileId) {
  //     throw new Error('User profile ID not found in context');
  //   }

  //   const payment = await this.paymentService.processCashDeposit(
  //     dto.branchId,
  //     Money.from(dto.amount),
  //     dto.payerProfileId,
  //     dto.branchId, // receiverId is now the branchId (branch wallet)
  //     WalletOwnerType.BRANCH, // receiverType is BRANCH
  //     ctx.userProfileId,
  //     PaymentReason.SESSION,
  //     dto.idempotencyKey,
  //   );

  //   return {
  //     data: payment,
  //     message: {
  //       key: 't.messages.created',
  //       args: { resource: 't.resources.item' },
  //     },
  //   };
  // }

  @Post('wallet-topup')
  @Transactional()
  @ApiOperation({
    summary: 'Initiate wallet top-up via Paymob',
    description:
      'Business event: User initiates wallet top-up through Paymob payment gateway. Returns checkout URL for payment completion. Payment will be processed via webhook.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Payment initiated successfully, redirect user to checkout URL',
  })
  async topupWallet(@Body() dto: WalletTopupDto): Promise<
    ControllerResponse<{
      payment: Payment;
      checkoutUrl: string;
      gatewayPaymentId: string;
    }>
  > {
    const ctx = RequestContext.get();
    if (!ctx.userProfileId) {
      throw new Error('User profile ID not found in context');
    }

    // No permission check needed - native user action
    // Payer is automatically the current user
    const result = await this.paymentService.initiateExternalPayment(
      Money.from(dto.amount),
      ctx.userProfileId, // payer is current user
      'EGP', // Default to EGP, can be made configurable
      'Wallet Top-up', // Description
      undefined, // gatewayType - defaults to Paymob
      dto.idempotencyKey,
      dto.methodType, // Payment method type
    );

    return {
      data: result,
      message: {
        key: 't.messages.created',
        args: { resource: 't.resources.payment' },
      },
    };
  }
}
