import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { Money } from '@/shared/common/utils/money.util';
import { BranchWithdrawalService } from '../services/branch-withdrawal.service';
import { BranchDepositService } from '../services/branch-deposit.service';
import { BranchWalletWithdrawalDto } from '../dto/branch-wallet-withdrawal.dto';
import { BranchCashWithdrawalDto } from '../dto/branch-cash-withdrawal.dto';
import { BranchWalletDepositDto } from '../dto/branch-wallet-deposit.dto';
import { BranchCashDepositDto } from '../dto/branch-cash-deposit.dto';
import {
  WithdrawalResult,
  DepositResult,
} from '../interfaces/withdrawal.interface';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';

@ApiTags('Finance - Branch Withdrawals')
@ApiBearerAuth()
@Controller('finance/branches')
export class BranchController {
  constructor(
    private readonly withdrawalService: BranchWithdrawalService,
    private readonly depositService: BranchDepositService,
  ) {}

  @Post(':branchId/wallet/withdraw')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.FINANCE.BRANCH_WALLET_WITHDRAW)
  @ApiOperation({
    summary: 'Withdraw money from branch wallet',
    description:
      'Allows authorized staff to withdraw money from their branch wallet balance. Requires BRANCH_WALLET_WITHDRAW permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            withdrawalId: { type: 'string', format: 'uuid' },
            amount: { type: 'string', example: '500.00' },
            method: { type: 'string', example: 'wallet' },
            branchId: { type: 'string', format: 'uuid' },
            staffId: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
            transactionId: { type: 'string', format: 'uuid' },
            newBalance: { type: 'string', example: '2500.00' },
            notes: { type: 'string', example: 'Office supplies purchase' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data or insufficient balance',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or no branch access',
  })
  async withdrawFromWallet(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: BranchWalletWithdrawalDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<WithdrawalResult>> {
    const result = await this.withdrawalService.withdrawFromWallet(
      branchId,
      Money.from(dto.amount),
      actor,
      dto.notes,
    );

    return ControllerResponse.success(result);
  }

  @Post(':branchId/cashbox/withdraw')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.FINANCE.BRANCH_CASH_WITHDRAW)
  @ApiOperation({
    summary: 'Withdraw money from branch cashbox',
    description:
      'Allows authorized staff to withdraw money from their branch cashbox. Requires BRANCH_CASH_WITHDRAW permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            withdrawalId: { type: 'string', format: 'uuid' },
            amount: { type: 'string', example: '200.00' },
            method: { type: 'string', example: 'cashbox' },
            branchId: { type: 'string', format: 'uuid' },
            staffId: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
            transactionId: { type: 'string', format: 'uuid' },
            newBalance: { type: 'string', example: '800.00' },
            notes: {
              type: 'string',
              example: ' Petty cash for daily expenses',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data or insufficient balance',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or no branch access',
  })
  async withdrawFromCashbox(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: BranchCashWithdrawalDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<WithdrawalResult>> {
    const result = await this.withdrawalService.withdrawFromCashbox(
      branchId,
      Money.from(dto.amount),
      actor,
      dto.notes,
    );

    return ControllerResponse.success(result);
  }

  @Post(':branchId/wallet/deposit')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.FINANCE.BRANCH_WALLET_DEPOSIT)
  @ApiOperation({
    summary: 'Deposit money to branch wallet',
    description:
      'Allows authorized staff to deposit money to their branch wallet balance. Requires BRANCH_WALLET_DEPOSIT permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            depositId: { type: 'string', format: 'uuid' },
            amount: { type: 'string', example: '1000.00' },
            method: { type: 'string', example: 'wallet' },
            branchId: { type: 'string', format: 'uuid' },
            staffId: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
            transactionId: { type: 'string', format: 'uuid' },
            newBalance: { type: 'string', example: '3500.00' },
            notes: { type: 'string', example: 'Daily sales deposit' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or no branch access',
  })
  async depositToWallet(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: BranchWalletDepositDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<DepositResult>> {
    const result = await this.depositService.depositToWallet(
      branchId,
      Money.from(dto.amount),
      actor,
      dto.notes,
    );

    return ControllerResponse.success(result);
  }

  @Post(':branchId/cashbox/deposit')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.FINANCE.BRANCH_CASH_DEPOSIT)
  @ApiOperation({
    summary: 'Deposit money to branch cashbox',
    description:
      'Allows authorized staff to deposit money to their branch cashbox. Requires BRANCH_CASH_DEPOSIT permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            depositId: { type: 'string', format: 'uuid' },
            amount: { type: 'string', example: '500.00' },
            method: { type: 'string', example: 'cashbox' },
            branchId: { type: 'string', format: 'uuid' },
            staffId: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
            transactionId: { type: 'string', format: 'uuid' },
            newBalance: { type: 'string', example: '1500.00' },
            notes: { type: 'string', example: 'Customer payment collection' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or no branch access',
  })
  async depositToCashbox(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: BranchCashDepositDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<DepositResult>> {
    const result = await this.depositService.depositToCashbox(
      branchId,
      Money.from(dto.amount),
      actor,
      dto.notes,
    );

    return ControllerResponse.success(result);
  }
}
