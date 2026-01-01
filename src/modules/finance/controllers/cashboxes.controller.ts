import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ManagerialOnly } from '@/shared/common/decorators';
import { CashboxService } from '../services/cashbox.service';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import {
  CenterTreasuryStatsDto,
  CenterIdParamDto,
  CenterStatementItemDto,
  CenterCashStatementItemDto,
} from '../dto/center-revenue-stats.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { Transaction } from '../entities/transaction.entity';
import { CashTransaction } from '../entities/cash-transaction.entity';
import { PaginateTransactionDto } from '../dto/paginate-transaction.dto';

@ApiTags('Center Revenue')
@ApiBearerAuth()
@Controller('finance/centers')
@ManagerialOnly()
export class CashboxesController {
  constructor(private readonly cashboxService: CashboxService) {}

  @Get(':centerId/treasury')
  @Permissions(PERMISSIONS.FINANCE.VIEW_CASHBOX)
  @ApiOperation({
    summary: 'Get center treasury statistics',
    description:
      'Get aggregated treasury statistics for a center including cashbox and wallet balances across all branches.',
  })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiResponse({
    status: 200,
    description: 'Treasury statistics retrieved successfully',
    type: CenterTreasuryStatsDto,
  })
  async getCenterTreasuryStats(
    @Param() params: CenterIdParamDto,
  ): Promise<ControllerResponse<CenterTreasuryStatsDto>> {
    const stats = await this.cashboxService.getCenterTreasuryStats(
      params.centerId,
    );

    return ControllerResponse.success(stats, 'Data retrieved successfully');
  }

  @Get(':centerId/statement')
  @Permissions(PERMISSIONS.FINANCE.VIEW_CASHBOX)
  @ApiOperation({
    summary: 'Get center wallet statement',
    description:
      'Get paginated wallet statement for all branches in a center. Optional branchId filter.',
  })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiQuery({
    name: 'branchId',
    description: 'Optional branch ID filter',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Center statement retrieved successfully',
  })
  async getCenterStatement(
    @Param() params: CenterIdParamDto,
    @Query() paginationDto: PaginateTransactionDto,
    @Query('branchId') branchId?: string,
  ): Promise<ControllerResponse<Pagination<CenterStatementItemDto>>> {
    const statement = await this.cashboxService.getCenterStatement(
      params.centerId,
      paginationDto,
      branchId,
    );

    return ControllerResponse.success(statement, 'Data retrieved successfully');
  }

  @Get(':centerId/cash-statement')
  @Permissions(PERMISSIONS.FINANCE.VIEW_CASHBOX)
  @ApiOperation({
    summary: 'Get center cash statement',
    description:
      'Get paginated cash transaction statement for all branches in a center. Optional branchId filter.',
  })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiQuery({
    name: 'branchId',
    description: 'Optional branch ID filter',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Center cash statement retrieved successfully',
  })
  async getCenterCashStatement(
    @Param() params: CenterIdParamDto,
    @Query() paginationDto: PaginateTransactionDto,
    @Query('branchId') branchId?: string,
  ): Promise<ControllerResponse<Pagination<CenterCashStatementItemDto>>> {
    const statement = await this.cashboxService.getCenterCashStatement(
      params.centerId,
      paginationDto,
      branchId,
    );

    return ControllerResponse.success(statement, 'Data retrieved successfully');
  }
}
