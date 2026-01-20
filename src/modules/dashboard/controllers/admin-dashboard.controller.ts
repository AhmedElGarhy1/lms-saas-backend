import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetUser, Permissions } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { AdminOverviewDto } from '../dto/admin-overview.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';

@ApiTags('Dashboard - Admin')
@ApiBearerAuth()
@Controller('dashboard/admin')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get admin dashboard overview',
    description: 'Get comprehensive overview metrics for system administration including all centers, financials, and system-wide statistics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview retrieved successfully',
    type: AdminOverviewDto,
  })
  @Permissions(PERMISSIONS.DASHBOARD.VIEW_ALL_CENTERS)
  async getOverview(@GetUser() actor: ActorUser): Promise<ControllerResponse<AdminOverviewDto>> {
    const result = await this.dashboardService.getAdminOverview(actor);
    return ControllerResponse.success(result);
  }
}