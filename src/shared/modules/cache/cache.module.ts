import { Global, Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-yet';
import { Config } from '../../config/config';

/**
 * Cache Module
 *
 * Configures NestJS Cache Manager with Redis store.
 * Uses the same Redis connection parameters as RedisModule.
 *
 * Note: While cache-manager-redis-yet creates its own connection internally,
 * it uses the same configuration (host, port, password) as RedisModule,
 * ensuring connections are made to the same Redis instance. Redis server
 * will handle connection pooling efficiently.
 *
 * Configuration:
 * - Store: Redis (via cache-manager-redis-yet)
 * - TTL: 60 seconds (default, can be overridden per route)
 * - Connection: Same host/port/password as RedisModule (via Config)
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: () => {
        const password = Config.redis.password;
        const passwordValue =
          password && password.trim() !== '' ? password : undefined;

        // Use same Redis connection parameters as RedisModule
        return {
          store: redisStore,
          host: Config.redis.host,
          port: Config.redis.port,
          password: passwordValue,
          ttl: 60 * 1000, // Default TTL: 60 seconds (in milliseconds)
        };
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
