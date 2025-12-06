import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from '@/shared/modules/redis/redis.module';
import { RateLimitService } from './services/rate-limit.service';
import { RateLimitFactoryService } from './services/rate-limit-factory.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitModuleOptions } from './interfaces/rate-limit-config.interface';
import { RATE_LIMIT_CONFIG } from './constants/rate-limit.constants';
import {
  defaultRateLimitConfig,
  contextRateLimitConfigs,
} from './config/rate-limit.config';

/**
 * Rate limit module
 * Provides unified rate limiting across HTTP, WebSocket, and notifications
 */
@Module({})
export class RateLimitModule {
  /**
   * Register rate limit module with synchronous configuration
   * @param options - Module configuration options
   * @returns Dynamic module configuration
   */
  static forRoot(options: RateLimitModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: RATE_LIMIT_CONFIG,
        useValue: {
          default: options.default || defaultRateLimitConfig,
          contexts: {
            ...contextRateLimitConfigs,
            ...options.contexts,
          },
        },
      },
      RateLimitFactoryService,
      RateLimitService,
      RateLimitGuard,
    ];

    return {
      module: RateLimitModule,
      global: true,
      imports: [RedisModule],
      providers,
      exports: [RateLimitService, RateLimitGuard],
    };
  }

  /**
   * Register rate limit module with asynchronous configuration
   * Useful for loading configuration from ConfigService
   * @param options - Async module configuration options
   * @returns Dynamic module configuration
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => Promise<RateLimitModuleOptions> | RateLimitModuleOptions;
    inject?: any[];
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: RATE_LIMIT_CONFIG,
        useFactory: async (...args: any[]) => {
          const config = await options.useFactory(...args);
          return {
            default: config.default || defaultRateLimitConfig,
            contexts: {
              ...contextRateLimitConfigs,
              ...config.contexts,
            },
          };
        },
        inject: options.inject || [],
      },
      RateLimitFactoryService,
      RateLimitService,
      RateLimitGuard,
    ];

    return {
      module: RateLimitModule,
      global: true,
      imports: [
        RedisModule,
        ...(options.imports || []),
        // Optionally import ThrottlerModule if using THROTTLER strategy
        // This allows the ThrottlerAdapter to access ThrottlerStorage
        ThrottlerModule,
      ],
      providers,
      exports: [RateLimitService, RateLimitGuard],
    };
  }
}
