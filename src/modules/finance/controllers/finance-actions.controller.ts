import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { PaymentService } from '../services/payment.service';
import { WalletTopupDto } from '../dto/wallet-topup.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { Payment } from '../entities/payment.entity';
import { Money } from '@/shared/common/utils/money.util';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@ApiTags('Finance Actions')
@ApiBearerAuth()
@Controller('finance')
export class FinanceActionsController {
  constructor(private readonly paymentService: PaymentService) {}

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
  async topupWallet(
    @Body() dto: WalletTopupDto,
    @GetUser() actor: ActorUser,
  ): Promise<
    ControllerResponse<{
      payment: Payment;
      checkoutUrl: string;
      gatewayPaymentId: string;
    }>
  > {
    // No permission check needed - native user action
    // Payer is automatically the current user
    const result = await this.paymentService.initiateExternalPayment(
      Money.from(dto.amount),
      actor.userProfileId, // payer is current user
      'EGP', // Default to EGP, can be made configurable
      'Wallet Top-up', // Description
      undefined, // gatewayType - defaults to Paymob
      dto.idempotencyKey,
      dto.methodType, // Payment method type
    );

    return {
      data: result,
      message: "Operation completed successfully",
    };
  }
}
