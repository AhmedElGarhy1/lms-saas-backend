import { Controller, Get, Post, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { CashboxService } from '../services/cashbox.service';
import { Cashbox } from '../entities/cashbox.entity';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';

@ApiTags('Cashboxes')
@ApiBearerAuth()
@Controller('finance/cashboxes')
export class CashboxesController {
  constructor(private readonly cashboxService: CashboxService) {}

  @Get('branch/:branchId')
  @Permissions(PERMISSIONS.FINANCE.VIEW_CASHBOX)
  @ApiOperation({
    summary: 'Get cashbox for branch',
    description: 'View cashbox balance.',
  })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({ status: 200, description: 'Cashbox retrieved successfully' })
  async getCashbox(
    @Param('branchId') branchId: string,
  ): Promise<ControllerResponse<Cashbox>> {
    const cashbox = await this.cashboxService.getCashbox(branchId);

    return {
      data: cashbox,
      message: {
        key: 't.messages.found',
        args: { resource: 't.resources.item' },
      },
    };
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
}
