// TypeScript Health Controller
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthStatus } from '../services/health.service';
import { Public } from '@/shared/common/decorators/public.decorator';
import { SystemNotReadyException } from '@/shared/common/exceptions/custom.exceptions';

@ApiTags('Health - System Status')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Get comprehensive system health status',
    description:
      'Retrieve detailed health information about all system components including database, memory, disk, CPU, cache, and external services.',
  })
  @ApiResponse({
    status: 200,
    description: 'System health status retrieved successfully',
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - System is unhealthy',
  })
  async getHealthStatus(): Promise<HealthStatus> {
    return this.healthService.getHealthStatus();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Check if system is ready to serve requests',
    description:
      'Kubernetes readiness probe endpoint. Returns 200 if the system is ready to accept traffic.',
  })
  @ApiResponse({
    status: 200,
    description: 'System is ready to serve requests',
  })
  @ApiResponse({
    status: 503,
    description: 'System is not ready to serve requests',
  })
  async getReadiness(): Promise<{ status: string; timestamp: string }> {
    const health = await this.healthService.getHealthStatus();

    if (health.status === 'healthy') {
      return { status: 'ready', timestamp: health.timestamp };
    } else {
      throw new SystemNotReadyException('System is not ready');
    }
  }
}
