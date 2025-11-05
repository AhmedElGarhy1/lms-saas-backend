import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@/modules/user/services/user.service';
import { JwtPayload } from '@/modules/auth/strategies/jwt.strategy';

/**
 * Custom Socket.IO adapter that integrates Redis for horizontal scaling
 * Extends NestJS IoAdapter to configure Redis adapter globally
 * Also adds global WebSocket authentication middleware
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private readonly app: INestApplicationContext;
  private jwtService: JwtService;
  private configService: ConfigService;
  private userService: UserService;

  constructor(
    private readonly redisService: RedisService,
    app: INestApplicationContext,
  ) {
    super(app);
    this.app = app;
    // Get services from app context (will be available after app is initialized)
    try {
      this.jwtService = app.get(JwtService, { strict: false });
      this.configService = app.get(ConfigService, { strict: false });
      this.userService = app.get(UserService, { strict: false });
    } catch {
      // Services might not be available yet, will be resolved in createIOServer
      this.logger.warn(
        'Could not resolve services in constructor, will resolve in createIOServer',
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    // Create the base Socket.IO server
    const server = super.createIOServer(port, options) as Server;

    // Resolve services if not already resolved
    if (!this.jwtService || !this.configService || !this.userService) {
      try {
        this.jwtService = this.app.get(JwtService, { strict: false });
        this.configService = this.app.get(ConfigService, { strict: false });
        this.userService = this.app.get(UserService, { strict: false });
      } catch (error) {
        this.logger.error(
          'Failed to resolve services for WebSocket authentication',
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    // Add global authentication middleware for all WebSocket namespaces
    if (this.jwtService && this.configService && this.userService) {
      this.setupAuthenticationMiddleware(server);
    } else {
      this.logger.warn(
        'WebSocket authentication middleware not configured - services unavailable',
      );
    }

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

  /**
   * Setup global authentication middleware for all WebSocket namespaces
   * This middleware runs before any connection is established
   * Attaches to known namespaces and hooks into namespace creation for future ones
   */
  private setupAuthenticationMiddleware(server: Server): void {
    // Define the authentication middleware function
    const authMiddleware = async (
      socket: Socket,
      next: (err?: Error) => void,
    ) => {
      try {
        // Extract token from handshake
        const token = this.extractToken(socket);

        if (!token) {
          this.logger.warn(
            `WebSocket connection rejected: No token provided (socketId: ${socket.id}, namespace: ${socket.nsp.name})`,
          );
          throw new Error('Unauthorized: No token provided');
        }

        // Verify JWT token
        const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: jwtSecret,
        });

        if (payload.type !== 'access') {
          this.logger.warn(
            `WebSocket connection rejected: Invalid token type (socketId: ${socket.id}, namespace: ${socket.nsp.name}, tokenType: ${payload.type})`,
          );
          throw new Error('Unauthorized: Invalid token type');
        }

        // Verify user exists and is active
        const user = await this.userService.findOne(payload.sub);
        if (!user) {
          this.logger.warn(
            `WebSocket connection rejected: User not found (socketId: ${socket.id}, namespace: ${socket.nsp.name}, userId: ${payload.sub})`,
          );
          throw new Error('Unauthorized: User not found');
        }

        if (!user.isActive) {
          this.logger.warn(
            `WebSocket connection rejected: User account is inactive (socketId: ${socket.id}, namespace: ${socket.nsp.name}, userId: ${payload.sub})`,
          );
          throw new Error('Unauthorized: User account is inactive');
        }

        // Attach user info to socket (type-safe assignment)
        (socket.data as { userId?: string; user?: unknown }).userId =
          payload.sub;
        (socket.data as { userId?: string; user?: unknown }).user = user;

        this.logger.debug(
          `WebSocket authentication successful (socketId: ${socket.id}, namespace: ${socket.nsp.name}, userId: ${payload.sub})`,
        );

        // Allow connection to proceed
        next();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Log authentication failure
        this.logger.warn(
          `WebSocket connection rejected: ${errorMessage} (socketId: ${socket.id}, namespace: ${socket.nsp.name})`,
        );

        // Pass error to next() - Socket.IO will handle rejection
        // If error already has 'Unauthorized' message, use it; otherwise create a generic one
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          next(error);
        } else {
          // For JWT verification errors (expired, malformed, etc.), provide a clear message
          next(
            new Error(
              'Unauthorized: Invalid or expired token. Please refresh your session.',
            ),
          );
        }
      }
    };

    // Apply middleware to the default namespace (root '/')
    // Type assertion needed for async middleware support
    (server.use as (middleware: typeof authMiddleware) => void)(authMiddleware);

    // Apply middleware to the /notifications namespace
    const notificationsNamespace = server.of('/notifications');
    (notificationsNamespace.use as (middleware: typeof authMiddleware) => void)(
      authMiddleware,
    );

    // Hook into namespace creation to apply middleware to future namespaces
    const originalOf = server.of.bind(server);
    server.of = (name: string | RegExp) => {
      const namespace = originalOf(name);
      // Apply middleware to newly created namespaces
      // Note: Socket.IO may create namespaces lazily, so this ensures
      // middleware is attached even if namespace is created later
      try {
        (namespace.use as (middleware: typeof authMiddleware) => void)(
          authMiddleware,
        );
      } catch {
        // Middleware might already be attached, ignore error
      }
      return namespace;
    };

    this.logger.log(
      'WebSocket authentication middleware configured for all namespaces',
    );
  }

  /**
   * Extract JWT token from socket handshake
   * Checks in order: auth.token, query.token, then Authorization header
   * Supports Socket.IO v4+ auth property and backward compatibility
   */
  private extractToken(socket: Socket): string | null {
    // Try to get token from auth property (Socket.IO v4+ preferred method)
    const authToken = (socket.handshake.auth as { token?: string })?.token;
    if (authToken) {
      return authToken;
    }

    // Try to get token from query parameter (backward compatibility)
    const queryToken = socket.handshake.query?.token as string;
    if (queryToken) {
      return queryToken;
    }

    // Try to get token from authorization header (backward compatibility)
    const authHeader = socket.handshake.headers?.authorization;
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      return authHeader.substring(7);
    }

    return null;
  }
}
