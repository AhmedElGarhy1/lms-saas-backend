import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { INestApplicationContext, Logger } from '@nestjs/common';

/**
 * Custom Socket.IO adapter that integrates Redis for horizontal scaling
 * Extends NestJS IoAdapter to configure Redis adapter globally
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(
    private readonly redisService: RedisService,
    app: INestApplicationContext,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    // Create the base Socket.IO server
    const server = super.createIOServer(port, options) as Server;

    try {
      // Get Redis clients for pub/sub
      const pubClient = this.redisService.getClient();
      const subClient = pubClient.duplicate();

      // Create Redis adapter for horizontal scaling
      const adapter = createAdapter(pubClient, subClient);
      server.adapter(adapter);

      this.logger.log('Socket.IO Redis adapter configured successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to initialize Redis adapter: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Continue without adapter - server will work in single-instance mode
      this.logger.warn(
        'Socket.IO server will run without Redis adapter (single-instance mode)',
      );
    }

    return server;
  }
}
