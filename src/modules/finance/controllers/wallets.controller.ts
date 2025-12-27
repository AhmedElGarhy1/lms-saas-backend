import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { Money } from '@/shared/common/utils/money.util';
import { WalletService } from '../services/wallet.service';
import { Wallet } from '../entities/wallet.entity';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { RequestContext } from '@/shared/common/context/request.context';
import { TransactionStatement } from '../repositories/transaction.repository';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { InsufficientPermissionsException } from '@/shared/common/exceptions/custom.exceptions';
import { PaginateTransactionDto } from '../dto/paginate-transaction.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { WalletTotalDto } from '../dto/wallet-total.dto';
import { WalletTransferDto } from '../dto/wallet-transfer.dto';

@ApiTags('Wallets')
@ApiBearerAuth()
@Controller('finance/wallets')
export class WalletsController {
  constructor(
    private readonly walletService: WalletService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user wallet',
    description: 'View own wallet balance and details. Read-only operation.',
  })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
  async getMyWallet(): Promise<ControllerResponse<Wallet>> {
    const ctx = RequestContext.get();
    if (!ctx.userProfileId) {
      throw new Error('User profile ID not found in context');
    }

    const wallet = await this.walletService.getWallet(
      ctx.userProfileId,
      WalletOwnerType.USER_PROFILE,
    );

    return {
      data: wallet,
      message: {
        key: 't.messages.found',
        args: { resource: 't.resources.item' },
      },
    };
  }

  @Get('me/statement')
  @ApiOperation({
    summary: 'Get current user wallet statement',
    description:
      'View own wallet statement with signed transaction amounts. Shows detailed transaction history with pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet statement retrieved successfully',
  })
  async getMyWalletStatement(
    @Query() dto: PaginateTransactionDto,
  ): Promise<ControllerResponse<Pagination<TransactionStatement>>> {
    const ctx = RequestContext.get();
    if (!ctx.userProfileId) {
      throw new Error('User profile ID not found in context');
    }

    // Get user's wallet first to obtain wallet ID
    const wallet = await this.walletService.getWallet(
      ctx.userProfileId,
      WalletOwnerType.USER_PROFILE,
    );

    // Then get the paginated statement (ownership validation is done in service layer)
    const statement = await this.walletService.getWalletStatementPaginated(
      wallet.id,
      dto,
    );

    return {
      data: statement,
      message: {
        key: 't.messages.found',
        args: { resource: 't.resources.item' },
      },
    };
  }

  @Get(':ownerId/:ownerType')
  @ApiOperation({
    summary: 'Get wallet by owner ID and type',
    description:
      'View wallet. Users can view their own wallet, admins can view any wallet.',
  })
  @ApiParam({ name: 'ownerId', description: 'Owner ID' })
  @ApiParam({
    name: 'ownerType',
    description: 'Owner type',
    enum: WalletOwnerType,
  })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
  async getWallet(
    @Param('ownerId') ownerId: string,
    @Param('ownerType') ownerType: WalletOwnerType,
  ): Promise<ControllerResponse<Wallet>> {
    const wallet = await this.walletService.getWallet(ownerId, ownerType);

    // Validate ownership (owner can view their own wallet, or admin)
    const { userProfileId } = RequestContext.get();
    if (!userProfileId) {
      throw new Error('User profile ID not found in context');
    }

    const isSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(userProfileId);
    const isAdmin =
      await this.accessControlHelperService.isAdmin(userProfileId);

    if (wallet.ownerId !== userProfileId && !isSuperAdmin && !isAdmin) {
      throw new InsufficientPermissionsException('t.messages.accessDenied');
    }

    return {
      data: wallet,
      message: {
        key: 't.messages.found',
        args: { resource: 't.resources.item' },
      },
    };
  }

  @Get(':walletId/statement')
  @ApiOperation({
    summary: 'Get paginated wallet statement with signed transaction amounts',
    description:
      'View wallet statement with pagination. Users can view their own statement, admins can view any statement.',
  })
  @ApiParam({ name: 'walletId', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet statement retrieved successfully',
  })
  async getWalletStatement(
    @Param('walletId') walletId: string,
    @Query() dto: PaginateTransactionDto,
  ): Promise<ControllerResponse<Pagination<TransactionStatement>>> {
    // Ownership validation is done in service layer
    const statement = await this.walletService.getWalletStatementPaginated(
      walletId,
      dto,
    );

    return {
      data: statement,
      message: {
        key: 't.messages.found',
        args: { resource: 't.resources.item' },
      },
    };
  }

  @Get('total')
  @ApiOperation({
    summary: 'Get total balance across all user wallets',
    description:
      'Get aggregated balance information across all wallets owned by the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Total balance retrieved successfully',
  })
  async getWalletTotal(): Promise<ControllerResponse<WalletTotalDto>> {
    const ctx = RequestContext.get();
    if (!ctx.userId) {
      throw new Error('User ID not found in context');
    }

    const total = await this.walletService.getUserTotalBalance(ctx.userId);

    return {
      data: total,
      message: {
        key: 't.messages.found',
        args: { resource: 't.resources.item' },
      },
    };
  }

  @Post('transfer')
  @Transactional()
  @ApiOperation({
    summary: 'Transfer money between user profiles',
    description:
      'Transfer money from one user profile wallet to another user profile wallet. Both profiles must belong to the same user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transfer completed successfully',
  })
  async transferBetweenWallets(
    @Body() dto: WalletTransferDto,
  ): Promise<ControllerResponse<{ correlationId: string }>> {
    const ctx = RequestContext.get();
    if (!ctx.userId) {
      throw new Error('User ID not found in context');
    }

    const result = await this.walletService.transferBetweenWallets(
      dto.fromProfileId,
      dto.toProfileId,
      Money.from(dto.amount),
      ctx.userId,
      dto.idempotencyKey,
    );

    return {
      data: { correlationId: result.correlationId },
      message: {
        key: 't.messages.success',
        args: { resource: 'Transfer completed' },
      },
    };
  }
}
