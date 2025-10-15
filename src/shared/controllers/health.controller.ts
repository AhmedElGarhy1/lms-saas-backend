import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthStatus } from '../services/health.service';
import { Public } from '@/shared/common/decorators/public.decorator';
import { SystemNotReadyException } from '@/shared/common/exceptions/custom.exceptions';

@ApiTags('Health')
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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy', 'degraded'],
              example: 'healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            uptime: {
              type: 'number',
              description: 'System uptime in milliseconds',
              example: 3600000,
            },
            version: { type: 'string', example: '1.0.0' },
            environment: { type: 'string', example: 'production' },
            checks: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                    responseTime: {
                      type: 'number',
                      description: 'Database response time in milliseconds',
                    },
                    connections: {
                      type: 'object',
                      properties: {
                        active: { type: 'number' },
                        idle: { type: 'number' },
                        total: { type: 'number' },
                      },
                    },
                  },
                },
                memory: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'unhealthy', 'warning'],
                    },
                    usage: {
                      type: 'object',
                      properties: {
                        total: {
                          type: 'number',
                          description: 'Total memory in bytes',
                        },
                        used: {
                          type: 'number',
                          description: 'Used memory in bytes',
                        },
                        free: {
                          type: 'number',
                          description: 'Free memory in bytes',
                        },
                        percentage: {
                          type: 'number',
                          description: 'Memory usage percentage',
                        },
                      },
                    },
                  },
                },
                disk: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'unhealthy', 'warning'],
                    },
                    usage: {
                      type: 'object',
                      properties: {
                        total: {
                          type: 'number',
                          description: 'Total disk space in bytes',
                        },
                        used: {
                          type: 'number',
                          description: 'Used disk space in bytes',
                        },
                        free: {
                          type: 'number',
                          description: 'Free disk space in bytes',
                        },
                        percentage: {
                          type: 'number',
                          description: 'Disk usage percentage',
                        },
                      },
                    },
                  },
                },
                cpu: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'unhealthy', 'warning'],
                    },
                    usage: {
                      type: 'object',
                      properties: {
                        current: {
                          type: 'number',
                          description: 'Current CPU usage percentage',
                        },
                        average: {
                          type: 'number',
                          description: 'Average CPU usage percentage',
                        },
                        cores: {
                          type: 'number',
                          description: 'Number of CPU cores',
                        },
                      },
                    },
                    load: {
                      type: 'object',
                      properties: {
                        '1min': {
                          type: 'number',
                          description: '1-minute load average',
                        },
                        '5min': {
                          type: 'number',
                          description: '5-minute load average',
                        },
                        '15min': {
                          type: 'number',
                          description: '15-minute load average',
                        },
                      },
                    },
                  },
                },
                cache: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                    hitRate: {
                      type: 'number',
                      description: 'Cache hit rate percentage',
                    },
                    size: {
                      type: 'number',
                      description: 'Cache size in bytes',
                    },
                    keys: {
                      type: 'number',
                      description: 'Number of cached keys',
                    },
                    memoryUsage: {
                      type: 'number',
                      description: 'Cache memory usage in bytes',
                    },
                  },
                },
                external: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      status: {
                        type: 'string',
                        enum: ['healthy', 'unhealthy'],
                      },
                      responseTime: { type: 'number' },
                      url: { type: 'string' },
                      lastCheck: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string' },
            version: { type: 'string' },
            processingTime: { type: 'number' },
          },
        },
      },
    },
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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ready' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
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
      throw new SystemNotReadyException();
    }
  }
}
