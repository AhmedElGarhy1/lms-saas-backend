import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { GetUser } from '@/shared/common/decorators';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { CashboxService } from '../services/cashbox.service';
import { Cashbox } from '../entities/cashbox.entity';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BranchIdParamDto } from '../dto/branch-id-param.dto';
import { PaginateCashboxesDto } from '../dto/paginate-cashboxes.dto';
import { Pagination } from '@/shared/common/types/pagination.types';

@ApiTags('Cashboxes')
@ApiBearerAuth()
@Controller('finance/cashboxes')
export class CashboxesController {
  constructor(private readonly cashboxService: CashboxService) {}

  @Get()
  @Permissions(PERMISSIONS.FINANCE.VIEW_CASHBOX)
  @ApiOperation({
    summary: 'List cashboxes with pagination',
    description: 'Get paginated list of cashboxes with optional filtering.',
  })
  @ApiResponse({ status: 200, description: 'Cashboxes retrieved successfully' })
  async listCashboxes(
    @Query() paginationDto: PaginateCashboxesDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<Cashbox>>> {
    const result = await this.cashboxService.paginateCashboxes(
      paginationDto,
      actor,
    );

    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.cashboxes' },
    });
  }

  @Get('branch/:branchId')
  @Permissions(PERMISSIONS.FINANCE.VIEW_CASHBOX)
  @ApiOperation({
    summary: 'Get cashbox for branch',
    description: 'View cashbox balance and details.',
  })
  @ApiResponse({ status: 200, description: 'Cashbox retrieved successfully' })
  async getCashbox(
    @Param() params: BranchIdParamDto,
  ): Promise<ControllerResponse<Cashbox>> {
    const cashbox = await this.cashboxService.getCashbox(params.branchId);

    return ControllerResponse.success(cashbox, {
      key: 't.messages.found',
      args: { resource: 't.resources.cashbox' },
    });
  }

  @Post(':id/audit')
  @Permissions(PERMISSIONS.FINANCE.VIEW_CASHBOX)
  @Transactional()
  @ApiOperation({ summary: 'Record cashbox audit timestamp' })
  @ApiParam({ name: 'id', description: 'Cashbox ID' })
  @ApiResponse({ status: 200, description: 'Audit recorded successfully' })
  async audit(@Param('id') id: string): Promise<ControllerResponse<Cashbox>> {
    const cashbox = await this.cashboxService.audit(id);

    return {
      data: cashbox,
      message: {
        key: 't.messages.updated',
        args: { resource: 't.resources.item' },
      },
    };
  }

  @Get('branch/:branchId/daily-summary')
  @Permissions(PERMISSIONS.FINANCE.VIEW_CASHBOX)
  @ApiOperation({
    summary: 'Get daily cash collection summary for branch',
    description:
      'Returns cash collected vs sessions for daily reconciliation. Used by accountants to verify drawer contents.',
  })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiQuery({
    name: 'date',
    description: 'Date for summary (defaults to today)',
    required: false,
    type: String,
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily summary retrieved successfully',
  })
  async getDailySummary(
    @Param() params: BranchIdParamDto,
    @GetUser() actor: ActorUser,
    @Query('date') date?: string,
  ): Promise<ControllerResponse<any>> {
    const summaryDate = date ? new Date(date) : new Date();
    const summary = await this.cashboxService.getDailySummary(
      params.branchId,
      summaryDate,
      actor,
    );

    return ControllerResponse.success(summary, {
      key: 't.messages.found',
      args: { resource: 't.resources.dailySummary' },
    });
  }
}
