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
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { CommonErrors } from '@/shared/common/exceptions/common.errors';
import { PaginateTransactionDto } from '../dto/paginate-transaction.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { WalletTotalDto } from '../dto/wallet-total.dto';
import { WalletTransferDto } from '../dto/wallet-transfer.dto';
import { WalletOwnerParamsDto } from '../dto/wallet-owner-params.dto';
import { WalletIdParamDto } from '../dto/wallet-id-param.dto';
import { UserWalletStatementItemDto } from '../dto/wallet-statement.dto';
import { AdminOnly, ManagerialOnly, GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@ApiTags('Wallets')
@ApiBearerAuth()
@Controller('finance/wallets')
export class WalletsController {
  constructor(
    private readonly walletService: WalletService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

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
  @AdminOnly()
  async getWallet(
    @Param() params: WalletOwnerParamsDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Wallet>> {
    const wallet = await this.walletService.getWallet(
      params.ownerId,
      params.ownerType,
    );

    return ControllerResponse.success(wallet);
  }

  @Get(':walletId/statement')
  @ApiOperation({
    summary: 'Get paginated wallet statement with signed transaction amounts',
    description:
      'View wallet statement with signed amounts, user names, and role information. Users can view their own statement, admins can view any statement.',
  })
  @ApiParam({ name: 'walletId', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet statement retrieved successfully',
  })
  @ManagerialOnly()
  async getWalletStatement(
    @Param() params: WalletIdParamDto,
    @Query() dto: PaginateTransactionDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<UserWalletStatementItemDto>>> {
    // Ownership validation is done in service layer
    const statement = await this.walletService.getWalletStatementPaginated(
      params.walletId,
      dto,
      actor,
    );

    return ControllerResponse.success(statement);
  }

  // @Post('transfer')
  // @Transactional()
  // @ApiOperation({
  //   summary: 'Transfer money between user profiles',
  //   description:
  //     'Transfer money from one user profile wallet to another user profile wallet. Both profiles must belong to the same user.',
  // })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Transfer completed successfully',
  // })
  // async transferBetweenWallets(
  //   @Body() dto: WalletTransferDto,
  //   @GetUser() actor: ActorUser,
  // ): Promise<ControllerResponse<{ correlationId: string }>> {
  //   const result = await this.walletService.transferBetweenWallets(
  //     dto.fromProfileId,
  //     dto.toProfileId,
  //     Money.from(dto.amount),
  //     actor.id,
  //     dto.idempotencyKey,
  //   );

  //   return ControllerResponse.success({ correlationId: result.correlationId });
  // }
}
