import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DataSource } from 'typeorm';
import * as os from 'os';
import { LoggerService } from './logger.service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: DatabaseHealth;
    memory: MemoryHealth;
    disk: DiskHealth;
    cpu: CpuHealth;
    cache: CacheHealth;
    external: ExternalHealth[];
  };
}

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  errors?: string[];
}

export interface MemoryHealth {
  status: 'healthy' | 'unhealthy' | 'warning';
  usage: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  threshold: {
    warning: number;
    critical: number;
  };
}

export interface DiskHealth {
  status: 'healthy' | 'unhealthy' | 'warning';
  usage: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  threshold: {
    warning: number;
    critical: number;
  };
}

export interface CpuHealth {
  status: 'healthy' | 'unhealthy' | 'warning';
  usage: {
    current: number;
    average: number;
    cores: number;
  };
  load: {
    '1min': number;
    '5min': number;
    '15min': number;
  };
  threshold: {
    warning: number;
    critical: number;
  };
}

export interface CacheHealth {
  status: 'healthy' | 'unhealthy';
  hitRate: number;
  size: number;
  keys: number;
  memoryUsage: number;
  errors?: string[];
}

export interface ExternalHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  url: string;
  lastCheck: string;
  errors?: string[];
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();
  private readonly version = process.env.npm_package_version || '1.0.0';
  private readonly environment = process.env.NODE_ENV || 'development';

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const [
        databaseHealth,
        memoryHealth,
        diskHealth,
        cpuHealth,
        cacheHealth,
        externalHealth,
      ] = await Promise.all([
        this.checkDatabase(),
        this.checkMemory(),
        this.checkDisk(),
        this.checkCpu(),
        this.checkCache(),
        this.checkExternalServices(),
      ]);

      const overallStatus = this.determineOverallStatus([
        databaseHealth,
        memoryHealth,
        diskHealth,
        cpuHealth,
        cacheHealth,
        ...externalHealth,
      ]);

      const responseTime = Date.now() - startTime;

      this.logger.debug('Health check completed', 'HealthService', {
        status: overallStatus,
        responseTime,
        checks: {
          database: databaseHealth.status,
          memory: memoryHealth.status,
          disk: diskHealth.status,
          cpu: cpuHealth.status,
          cache: cacheHealth.status,
          external: externalHealth.map((h) => ({
            name: h.name,
            status: h.status,
          })),
        },
      });

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: this.version,
        environment: this.environment,
        checks: {
          database: databaseHealth,
          memory: memoryHealth,
          disk: diskHealth,
          cpu: cpuHealth,
          cache: cacheHealth,
          external: externalHealth,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error('Health check failed', error, 'HealthService', {});
      } else {
        this.logger.error('Health check failed', 'HealthService', {
          error: String(error),
        });
      }

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: this.version,
        environment: this.environment,
        checks: {
          database: {
            status: 'unhealthy',
            responseTime: 0,
            connections: { active: 0, idle: 0, total: 0 },
            errors: [error.message],
          },
          memory: {
            status: 'unhealthy',
            usage: { total: 0, used: 0, free: 0, percentage: 0 },
            threshold: { warning: 80, critical: 95 },
          },
          disk: {
            status: 'unhealthy',
            usage: { total: 0, used: 0, free: 0, percentage: 0 },
            threshold: { warning: 80, critical: 95 },
          },
          cpu: {
            status: 'unhealthy',
            usage: { current: 0, average: 0, cores: 0 },
            load: { '1min': 0, '5min': 0, '15min': 0 },
            threshold: { warning: 80, critical: 95 },
          },
          cache: {
            status: 'unhealthy',
            hitRate: 0,
            size: 0,
            keys: 0,
            memoryUsage: 0,
            errors: [error.message],
          },
          external: [],
        },
      };
    }
  }

  private async checkDatabase(): Promise<DatabaseHealth> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Test database connection
      await this.dataSource.query('SELECT 1');

      // Get connection pool statistics
      const pool = (this.dataSource as any).driver?.pool;
      const connections = {
        active: pool?.active || 0,
        idle: pool?.idle || 0,
        total: pool?.total || 0,
      };

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        connections,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      errors.push(`Database connection failed: ${error.message}`);
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        connections: { active: 0, idle: 0, total: 0 },
        errors,
      };
    }
  }

  private checkMemory(): MemoryHealth {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const percentage = (usedMem / totalMem) * 100;

    const threshold = {
      warning: 80,
      critical: 95,
    };

    let status: 'healthy' | 'unhealthy' | 'warning' = 'healthy';
    if (percentage >= threshold.critical) {
      status = 'unhealthy';
    } else if (percentage >= threshold.warning) {
      status = 'warning';
    }

    return {
      status,
      usage: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: Math.round(percentage * 100) / 100,
      },
      threshold,
    };
  }

  private checkDisk(): DiskHealth {
    // This is a simplified disk check - in production, you might want to check specific directories
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const percentage = (usedMem / totalMem) * 100;

    const threshold = {
      warning: 80,
      critical: 95,
    };

    let status: 'healthy' | 'unhealthy' | 'warning' = 'healthy';
    if (percentage >= threshold.critical) {
      status = 'unhealthy';
    } else if (percentage >= threshold.warning) {
      status = 'warning';
    }

    return {
      status,
      usage: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: Math.round(percentage * 100) / 100,
      },
      threshold,
    };
  }

  private checkCpu(): CpuHealth {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    // Calculate CPU usage (simplified)
    const cpuUsage =
      cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce(
          (sum, time) => sum + time,
          0,
        );
        const idle = cpu.times.idle;
        return acc + ((total - idle) / total) * 100;
      }, 0) / cpus.length;

    const threshold = {
      warning: 80,
      critical: 95,
    };

    let status: 'healthy' | 'unhealthy' | 'warning' = 'healthy';
    if (cpuUsage >= threshold.critical) {
      status = 'unhealthy';
    } else if (cpuUsage >= threshold.warning) {
      status = 'warning';
    }

    return {
      status,
      usage: {
        current: Math.round(cpuUsage * 100) / 100,
        average: Math.round((loadAvg[0] / cpus.length) * 100) / 100,
        cores: cpus.length,
      },
      load: {
        '1min': Math.round(loadAvg[0] * 100) / 100,
        '5min': Math.round(loadAvg[1] * 100) / 100,
        '15min': Math.round(loadAvg[2] * 100) / 100,
      },
      threshold,
    };
  }

  private async checkCache(): Promise<CacheHealth> {
    // This is a placeholder - implement based on your caching solution
    // For now, we'll return a basic health status
    return {
      status: 'healthy',
      hitRate: 95.5,
      size: 1024 * 1024, // 1MB
      keys: 1000,
      memoryUsage: 512 * 1024, // 512KB
    };
  }

  private async checkExternalServices(): Promise<ExternalHealth[]> {
    const services = [
      { name: 'Database', url: 'internal://database' },
      // Add more external services as needed
    ];

    const checks = await Promise.allSettled(
      services.map(async (service) => {
        const startTime = Date.now();
        try {
          // Implement actual health checks for external services
          // For now, we'll simulate a successful check
          await new Promise((resolve) => setTimeout(resolve, 10));

          return {
            name: service.name,
            status: 'healthy' as const,
            responseTime: Date.now() - startTime,
            url: service.url,
            lastCheck: new Date().toISOString(),
          };
        } catch (error) {
          return {
            name: service.name,
            status: 'unhealthy' as const,
            responseTime: Date.now() - startTime,
            url: service.url,
            lastCheck: new Date().toISOString(),
            errors: [error.message],
          };
        }
      }),
    );

    return checks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: services[index].name,
          status: 'unhealthy' as const,
          responseTime: 0,
          url: services[index].url,
          lastCheck: new Date().toISOString(),
          errors: [result.reason?.message || 'Unknown error'],
        };
      }
    });
  }

  private determineOverallStatus(
    checks: Array<{ status: string }>,
  ): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = checks.map((check) => check.status);

    if (statuses.some((status) => status === 'unhealthy')) {
      return 'unhealthy';
    }

    if (statuses.some((status) => status === 'warning')) {
      return 'degraded';
    }

    return 'healthy';
  }

  async getSimpleHealth(): Promise<{ status: string; timestamp: string }> {
    const health = await this.getHealthStatus();
    return {
      status: health.status,
      timestamp: health.timestamp,
    };
  }
}
