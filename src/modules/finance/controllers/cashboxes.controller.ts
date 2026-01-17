import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ManagerialOnly, GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { CashboxService } from '../services/cashbox.service';
import { PaymentService } from '../services/payment.service';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import {
  CenterTreasuryStatsDto,
  CenterIdParamDto,
  CenterStatementItemDto,
  CenterCashStatementItemDto,
} from '../dto/center-revenue-stats.dto';
import { UserPaymentStatementItemDto } from '../dto/payment-statement.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { CenterStatementQueryDto } from '../dto/center-statement-query.dto';
import { PaginatePaymentDto } from '../dto/paginate-payment.dto';
import { DateRangeDto } from '@/shared/common/dto/date-range.dto';

@ApiTags('Center Revenue')
@ApiBearerAuth()
@Controller('finance/centers')
@ManagerialOnly()
export class CashboxesController {
  constructor(
    private readonly cashboxService: CashboxService,
    private readonly paymentService: PaymentService,
  ) {}

  @Permissions(PERMISSIONS.FINANCE.VIEW_TREASURY)
  @Get(':centerId/treasury')
  @ApiOperation({
    summary: 'Get center treasury statistics',
    description:
      'Get aggregated treasury statistics for a center including cashbox and wallet balances across all branches. Optional date range filtering.',
  })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiQuery({
    name: 'dateFrom',
    description: 'Filter from date (ISO 8601 format)',
    required: false,
    type: Date,
  })
  @ApiQuery({
    name: 'dateTo',
    description: 'Filter to date (ISO 8601 format)',
    required: false,
    type: Date,
  })
  @ApiResponse({
    status: 200,
    description: 'Treasury statistics retrieved successfully',
    type: CenterTreasuryStatsDto,
  })
  async getCenterTreasuryStats(
    @Param() params: CenterIdParamDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<CenterTreasuryStatsDto>> {
    const stats = await this.cashboxService.getCenterTreasuryStats(
      params.centerId,
      actor,
    );

    return ControllerResponse.success(stats);
  }

  @Permissions(PERMISSIONS.FINANCE.VIEW_WALLET_STATEMENT)
  @Get('statements')
  @ApiOperation({
    summary: 'Get center wallet statements',
    description:
      'Get paginated wallet statements for centers. Auto-filters by actor center if available, otherwise returns all centers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Center statements retrieved successfully',
  })
  async getCenterStatements(
    @Query() query: CenterStatementQueryDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<CenterStatementItemDto>>> {
    const centerId = actor.centerId;
    const statement = await this.cashboxService.getCenterStatement(
      centerId,
      query,
      actor,
    );

    return ControllerResponse.success(statement);
  }

  @Permissions(PERMISSIONS.FINANCE.VIEW_PAYMENTS)
  @Get('payments')
  @ApiOperation({
    summary: 'Get center payment records',
    description:
      'Get paginated payment records for centers. Auto-filters by actor center if available. Supports filtering by payment status, reason, and payment method.',
  })
  @ApiResponse({
    status: 200,
    description: 'Center payments retrieved successfully',
  })
  async getCenterPayments(
    @Query() query: PaginatePaymentDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<UserPaymentStatementItemDto>>> {
    const payments = await this.paymentService.getCenterPaymentsPaginated(
      query,
      actor,
    );

    return ControllerResponse.success(payments);
  }

  @Permissions(PERMISSIONS.FINANCE.VIEW_CASH_STATEMENT)
  @Get('cash-statement')
  @ApiOperation({
    summary: 'Get center cash statements',
    description:
      'Get paginated cash transaction statements for centers. Auto-filters by actor center if available, otherwise returns all centers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Center cash statements retrieved successfully',
  })
  async getCenterCashStatements(
    @Query() query: CenterStatementQueryDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<CenterCashStatementItemDto>>> {
    const centerId = actor.centerId;
    const statement = await this.cashboxService.getCenterCashStatement(
      centerId,
      query,
      actor,
    );

    return ControllerResponse.success(statement);
  }
}
