import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from '../services/reports.service';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';

@ApiTags('Finance Reports')
@ApiBearerAuth()
@Controller('finance/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @Permissions(PERMISSIONS.FINANCE.MANAGE_FINANCE)
  @ApiOperation({
    summary: 'Get revenue report',
    description: 'Shows total revenue grouped by payment type (Cash, Wallet, Package Credits)',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date (YYYY-MM-DD)',
    required: false,
    type: String,
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date (YYYY-MM-DD)',
    required: false,
    type: String,
    example: '2024-12-31',
  })
  @ApiQuery({
    name: 'centerId',
    description: 'Filter by center ID',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'branchId',
    description: 'Filter by branch ID',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue report retrieved successfully',
    schema: {
      example: {
        data: {
          totalRevenue: 12500.50,
          breakdown: {
            cash: 7500.00,
            wallet: 3500.50,
            packageCredits: 1500.00,
          },
          period: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
          },
          summary: 'Total revenue: 12,500.50 EGP (Cash: 7,500.00, Wallet: 3,500.50, Package Credits: 1,500.00)',
        },
      },
    },
  })
  async getRevenueReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('centerId') centerId?: string,
    @Query('branchId') branchId?: string,
  ): Promise<ControllerResponse<any>> {
    const report = await this.reportsService.getRevenueReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      centerId,
      branchId,
    });

    return ControllerResponse.success(report, {
      key: 't.messages.found',
      args: { resource: 't.resources.revenueReport' },
    });
  }

  @Get('cash-reconciliation')
  @Permissions(PERMISSIONS.FINANCE.VIEW_CASHBOX)
  @ApiOperation({
    summary: 'Get cash reconciliation summary',
    description: 'Compares expected cash in drawer vs actual cashbox balance for accounting purposes',
  })
  @ApiQuery({
    name: 'date',
    description: 'Date for reconciliation (YYYY-MM-DD)',
    required: false,
    type: String,
    example: '2024-01-15',
  })
  @ApiQuery({
    name: 'branchId',
    description: 'Branch ID for reconciliation',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Cash reconciliation retrieved successfully',
    schema: {
      example: {
        data: {
          branchId: 'branch-123',
          date: '2024-01-15',
          expectedCashFromSessions: 8500.00,
          actualCashboxBalance: 8750.00,
          discrepancy: 250.00,
          status: 'OVER', // UNDER, MATCHED, OVER
          sessionCount: 17,
          summary: 'Expected 8,500.00 EGP from 17 sessions. Cashbox shows 8,750.00 EGP. Discrepancy: +250.00 EGP.',
        },
      },
    },
  })
  async getCashReconciliation(
    @Query('branchId') branchId: string,
    @Query('date') date?: string,
  ): Promise<ControllerResponse<any>> {
    const reconciliationDate = date ? new Date(date) : new Date();
    const report = await this.reportsService.getCashReconciliation(branchId, reconciliationDate);

    return ControllerResponse.success(report, {
      key: 't.messages.found',
      args: { resource: 't.resources.cashReconciliation' },
    });
  }
}
