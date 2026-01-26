import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetUser, Permissions } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CenterDashboardService } from '../services/center-dashboard.service';
import { CenterOverviewDto } from '../dto/center-overview.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard/center')
export class CenterDashboardController {
  constructor(private readonly dashboardService: CenterDashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get center dashboard overview',
    description:
      'Get comprehensive overview metrics for center management including financials, headcount, and activity data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview retrieved successfully',
    type: CenterOverviewDto,
  })
  @Permissions(PERMISSIONS.DASHBOARD.READ)
  async getOverview(
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<CenterOverviewDto>> {
    const result = await this.dashboardService.getCenterOverview(actor);
    return ControllerResponse.success(result);
  }
}
