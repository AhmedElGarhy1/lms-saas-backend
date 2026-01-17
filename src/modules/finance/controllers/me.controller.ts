import { Controller, Get, Query, Post, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { WalletService } from '../services/wallet.service';
import { PaymentService } from '../services/payment.service';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { Wallet } from '../entities/wallet.entity';
import { Payment } from '../entities/payment.entity';
import { Pagination } from '@/shared/common/types/pagination.types';
import { UserWalletStatementItemDto } from '../dto/wallet-statement.dto';
import { UserPaymentStatementItemDto } from '../dto/payment-statement.dto';
import { PaginateTransactionDto } from '../dto/paginate-transaction.dto';
import { PaginatePaymentDto } from '../dto/paginate-payment.dto';
import { WalletTopupDto } from '../dto/wallet-topup.dto';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { WalletTotalDto } from '../dto/wallet-total.dto';
import { Money } from '@/shared/common/utils/money.util';

@ApiTags('My Finance')
@ApiBearerAuth()
@Controller('finance/me')
export class MeController {
  constructor(
    private readonly walletService: WalletService,
    private readonly paymentService: PaymentService,
  ) {}

  @Get('wallet')
  @ApiOperation({
    summary: 'Get my wallet',
    description: 'View my wallet balance and details. Read-only operation.',
  })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
  async getMyWallet(
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Wallet>> {
    const wallet = await this.walletService.getWallet(
      actor.userProfileId,
      WalletOwnerType.USER_PROFILE,
    );

    return ControllerResponse.success(wallet);
  }

  @Get('wallet/total')
  @ApiOperation({
    summary: 'Get my total wallet balance',
    description: 'Get aggregated balance information across all my wallets.',
  })
  @ApiResponse({
    status: 200,
    description: 'Total balance retrieved successfully',
  })
  async getMyWalletTotal(
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<WalletTotalDto>> {
    const total = await this.walletService.getUserTotalBalance(actor.id);

    return ControllerResponse.success(total);
  }

  @Get('statement')
  @ApiOperation({
    summary: 'Get my wallet statement',
    description:
      'View my wallet statement with signed amounts, user names, and role information. Shows detailed transaction history with pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet statement retrieved successfully',
  })
  async getMyWalletStatement(
    @Query() dto: PaginateTransactionDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<UserWalletStatementItemDto>>> {
    const wallet = await this.walletService.getWallet(
      actor.userProfileId,
      WalletOwnerType.USER_PROFILE,
    );

    const statement = await this.walletService.getWalletStatementPaginated(
      wallet.id,
      dto,
      actor,
    );

    return ControllerResponse.success(statement);
  }

  @Get('payments')
  @ApiOperation({
    summary: 'Get my payments statement',
    description:
      'View my payments with sender/receiver names and role information. Shows detailed payment history with pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
  })
  async getMyPayments(
    @Query() dto: PaginatePaymentDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<UserPaymentStatementItemDto>>> {
    const result = await this.paymentService.getUserPaymentsPaginated(
      dto,
      actor,
    );

    return ControllerResponse.success(result);
  }


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
      actor, // Pass the actor
      'Wallet Top-up', // Description
      undefined, // gatewayType - defaults to Paymob
      dto.idempotencyKey,
      dto.methodType, // Payment method type
    );

    return ControllerResponse.success(result);
  }
}
