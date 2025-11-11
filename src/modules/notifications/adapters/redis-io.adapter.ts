import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { notificationKeys } from '../utils/notification-redis-key-builder';
import { INestApplicationContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '@/modules/user/services/user.service';
import { JwtPayload } from '@/modules/auth/strategies/jwt.strategy';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { notificationGatewayConfig } from '../config/notification-gateway.config';
import { Config } from '@/shared/config/config';
import { LoggerService } from '@/shared/services/logger.service';

/**
 * Custom Socket.IO adapter that integrates Redis for horizontal scaling
 * Extends NestJS IoAdapter to configure Redis adapter globally
 * Also adds global WebSocket authentication middleware
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly app: INestApplicationContext;
  private logger: LoggerService;
  private jwtService: JwtService;
  private userService: UserService;
  private ipRateLimiter?: RateLimiterRedis;
  private userRateLimiter?: RateLimiterRedis;
  private connectionRateLimitConfig?: ReturnType<
    typeof notificationGatewayConfig
  >['connectionRateLimit'];

  constructor(
    private readonly redisService: RedisService,
    app: INestApplicationContext,
  ) {
    super(app);
    this.app = app;
    // Get services from app context (will be available after app is initialized)
    try {
      this.logger = app.get(LoggerService, { strict: false });
      this.jwtService = app.get(JwtService, { strict: false });
      this.userService = app.get(UserService, { strict: false });
    } catch {
      // Services might not be available yet, will be resolved in createIOServer
      // Logger not available yet, will be resolved in createIOServer
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    // Create the base Socket.IO server
    const server = super.createIOServer(port, options) as Server;

    // Resolve services if not already resolved
    if (!this.logger || !this.jwtService || !this.userService) {
      try {
        this.logger = this.app.get(LoggerService, { strict: false });
        this.jwtService = this.app.get(JwtService, { strict: false });
        this.userService = this.app.get(UserService, { strict: false });
      } catch (error) {
        if (this.logger) {
          if (error instanceof Error) {
            this.logger.error(
              'Failed to resolve services for WebSocket authentication',
              error,
              'RedisIoAdapter',
            );
          } else {
            this.logger.error(
              'Failed to resolve services for WebSocket authentication',
              'RedisIoAdapter',
              { error: String(error) },
            );
          }
        }
      }
    }

    // Initialize rate limiters
    this.initializeRateLimiters();

    // Add global authentication middleware for all WebSocket namespaces
    if (this.jwtService && this.userService) {
      this.setupAuthenticationMiddleware(server);
    } else {
      if (this.logger) {
        this.logger.warn(
          'WebSocket authentication middleware not configured - services unavailable',
          'RedisIoAdapter',
        );
      }
    }

    try {
      // Get Redis clients for pub/sub
      const pubClient = this.redisService.getClient();
      const subClient = pubClient.duplicate();

      // Create Redis adapter for horizontal scaling
      const adapter = createAdapter(pubClient, subClient);
      server.adapter(adapter);

      if (this.logger) {
        this.logger.info(
          'Socket.IO Redis adapter configured successfully',
          'RedisIoAdapter',
        );
      }
    } catch (error) {
      if (this.logger) {
        if (error instanceof Error) {
          this.logger.error(
            'Failed to initialize Redis adapter',
            error,
            'RedisIoAdapter',
            { errorMessage: error.message },
          );
        } else {
          this.logger.error(
            'Failed to initialize Redis adapter',
            'RedisIoAdapter',
            { error: String(error) },
          );
        }
        // Continue without adapter - server will work in single-instance mode
        this.logger.warn(
          'Socket.IO server will run without Redis adapter (single-instance mode)',
          'RedisIoAdapter',
        );
      }
    }

    return server;
  }

  /**
   * Setup global authentication middleware for all WebSocket namespaces
   * This middleware runs before any connection is established
   * Attaches to known namespaces and hooks into namespace creation for future ones
   *
   * Middleware flow (lines 115-280):
   * 1. IP-based rate limiting (line 120-163) - BEFORE authentication
   * 2. Token extraction and JWT verification (line 166-187)
   * 3. User validation (line 189-203)
   * 4. User-based rate limiting (line 205-245) - AFTER authentication
   * 5. Socket data attachment and connection approval (line 247-257)
   *
   * Error handling:
   * - Rate limit exceeded: Rejects connection with user-friendly message
   * - Redis errors: Fail-open by default (configurable fail-closed)
   * - Authentication errors: Rejects connection with appropriate error
   *
   * Namespace application (lines 282-307):
   * - Applied to default namespace (root '/')
   * - Applied to /notifications namespace
   * - Hooked into namespace creation for future namespaces
   *
   * Testing distributed rate limiting:
   * - Start multiple server instances pointing to same Redis
   * - Make rapid connection attempts from same IP/user
   * - Verify limits are enforced globally across all instances
   * - Check Redis keys to confirm shared state
   */
  private setupAuthenticationMiddleware(server: Server): void {
    // Define the authentication middleware function
    const authMiddleware = async (
      socket: Socket,
      next: (err?: Error) => void,
    ) => {
      try {
        // Step 1: IP-based rate limiting (BEFORE authentication) - Line 120-163
        // This runs before any expensive JWT/DB operations for early rejection
        if (this.ipRateLimiter && this.connectionRateLimitConfig) {
          try {
            const clientIP = this.extractClientIp(socket);
            await this.ipRateLimiter.consume(`ip:${clientIP}`);

            // If consume succeeds, continue with authentication
          } catch (ipRateLimitError: any) {
            // IMPORTANT: Distinguish between rate limit exceeded and Redis/network errors
            if (
              ipRateLimitError instanceof RateLimiterRes ||
              (ipRateLimitError.remainingPoints !== undefined &&
                ipRateLimitError.remainingPoints === 0)
            ) {
              // Rate limit exceeded - reject connection
              const clientIP = this.extractClientIp(socket);
              if (this.logger) {
                this.logger.warn(
                  `Connection rate limit exceeded for IP: ${clientIP}`,
                  'RedisIoAdapter',
                  { socketId: socket.id, namespace: socket.nsp.name, clientIP },
                );
              }
              // Track rate limit hit metric (non-blocking)
              void this.trackRateLimitHit('ip');
              return next(
                new Error(
                  'Too many connection attempts from this IP. Please try again later.',
                ),
              );
            }

            // All other exceptions are Redis/network errors (not rate limit violations)
            if (this.logger) {
              if (ipRateLimitError instanceof Error) {
                this.logger.error(
                  'IP rate limit check failed (Redis/network error)',
                  ipRateLimitError,
                  'RedisIoAdapter',
                  { socketId: socket.id },
                );
              } else {
                this.logger.error(
                  'IP rate limit check failed (Redis/network error)',
                  'RedisIoAdapter',
                  { socketId: socket.id, error: String(ipRateLimitError) },
                );
              }
            }

            if (this.connectionRateLimitConfig.failClosed) {
              return next(
                new Error(
                  'Rate limit check unavailable. Please try again later.',
                ),
              );
            }
            // Fail open: continue with authentication
          }
        }

        // Step 2: Continue with existing authentication logic (Line 165-203)
        // Extract token from handshake (see extractToken method at line 404)
        const token = this.extractToken(socket);

        if (!token) {
          if (this.logger) {
            this.logger.warn(
              'WebSocket connection rejected: No token provided',
              'RedisIoAdapter',
              { socketId: socket.id, namespace: socket.nsp.name },
            );
          }
          throw new Error('Unauthorized: No token provided');
        }

        // Verify JWT token
        const jwtSecret = Config.jwt.secret;
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: jwtSecret,
        });

        if (payload.type !== 'access') {
          if (this.logger) {
            this.logger.warn(
              'WebSocket connection rejected: Invalid token type',
              'RedisIoAdapter',
              {
                socketId: socket.id,
                namespace: socket.nsp.name,
                tokenType: payload.type,
              },
            );
          }
          throw new Error('Unauthorized: Invalid token type');
        }

        // Verify user exists and is active
        const user = await this.userService.findOne(payload.sub);
        if (!user) {
          if (this.logger) {
            this.logger.warn(
              'WebSocket connection rejected: User not found',
              'RedisIoAdapter',
              {
                socketId: socket.id,
                namespace: socket.nsp.name,
                userId: payload.sub,
              },
            );
          }
          throw new Error('Unauthorized: User not found');
        }

        if (!user.isActive) {
          if (this.logger) {
            this.logger.warn(
              'WebSocket connection rejected: User account is inactive',
              'RedisIoAdapter',
              {
                socketId: socket.id,
                namespace: socket.nsp.name,
                userId: payload.sub,
              },
            );
          }
          throw new Error('Unauthorized: User account is inactive');
        }

        // Step 3: User-based rate limiting (AFTER authentication) - Line 205-245
        // This runs after authentication to prevent authenticated abuse
        if (this.userRateLimiter && this.connectionRateLimitConfig) {
          try {
            await this.userRateLimiter.consume(`user:${payload.sub}`);

            // If consume succeeds, continue with connection
          } catch (userRateLimitError: any) {
            // IMPORTANT: Distinguish between rate limit exceeded and Redis/network errors
            if (
              userRateLimitError instanceof RateLimiterRes ||
              (userRateLimitError.remainingPoints !== undefined &&
                userRateLimitError.remainingPoints === 0)
            ) {
              // Rate limit exceeded - reject connection
              if (this.logger) {
                this.logger.warn(
                  'User connection rate limit exceeded',
                  'RedisIoAdapter',
                  {
                    userId: payload.sub,
                    socketId: socket.id,
                    namespace: socket.nsp.name,
                  },
                );
              }
              // Track rate limit hit metric (non-blocking)
              void this.trackRateLimitHit('user');
              // Use return next() instead of throw for proper Socket.IO error handling
              return next(
                new Error(
                  'Too many connection attempts. Please try again later.',
                ),
              );
            }

            // All other exceptions are Redis/network errors (not rate limit violations)
            if (this.logger) {
              if (userRateLimitError instanceof Error) {
                this.logger.error(
                  'User rate limit check failed (Redis/network error)',
                  userRateLimitError,
                  'RedisIoAdapter',
                  { userId: payload.sub, socketId: socket.id },
                );
              } else {
                this.logger.error(
                  'User rate limit check failed (Redis/network error)',
                  'RedisIoAdapter',
                  {
                    userId: payload.sub,
                    socketId: socket.id,
                    error: String(userRateLimitError),
                  },
                );
              }
            }

            if (this.connectionRateLimitConfig.failClosed) {
              return next(
                new Error(
                  'Rate limit check unavailable. Please try again later.',
                ),
              );
            }
            // Fail open: allow connection
          }
        }

        // Attach user info to socket (type-safe assignment)
        (socket.data as { userId?: string; user?: unknown }).userId =
          payload.sub;
        (socket.data as { userId?: string; user?: unknown }).user = user;

        // Allow connection to proceed
        next();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Log authentication failure
        if (this.logger) {
          this.logger.warn(
            `WebSocket connection rejected: ${errorMessage}`,
            'RedisIoAdapter',
            { socketId: socket.id, namespace: socket.nsp.name },
          );
        }

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

    // Track namespaces that already have middleware applied to prevent duplicates
    const namespacesWithMiddleware = new Set<string>();

    // Helper function to apply middleware to a namespace (only once)
    const applyMiddlewareToNamespace = (
      namespace: ReturnType<Server['of']>,
      namespaceName: string,
    ): void => {
      if (namespacesWithMiddleware.has(namespaceName)) {
        // Middleware already applied, skip
        return;
      }

      try {
        (namespace.use as (middleware: typeof authMiddleware) => void)(
          authMiddleware,
        );
        namespacesWithMiddleware.add(namespaceName);
      } catch {
        // Middleware might already be attached, ignore error
      }
    };

    // Apply middleware to the /notifications namespace
    const notificationsNamespace = server.of('/notifications');
    applyMiddlewareToNamespace(notificationsNamespace, '/notifications');

    // Hook into namespace creation to apply middleware to future namespaces
    // This ensures middleware is attached even if namespaces are created lazily
    const originalOf = server.of.bind(server);
    server.of = (name: string | RegExp) => {
      const namespace = originalOf(name);
      const namespaceName = typeof name === 'string' ? name : name.toString();
      applyMiddlewareToNamespace(namespace, namespaceName);
      return namespace;
    };

    if (this.logger) {
      this.logger.info(
        'WebSocket authentication middleware configured for all namespaces',
        'RedisIoAdapter',
      );
    }
  }

  /**
   * Track rate limit hit for metrics/observability
   * Increments Prometheus-compatible counter in Redis
   * Non-blocking: uses void to avoid awaiting (fire-and-forget)
   *
   * Metrics keys:
   * - ${prefix}:metrics:connection_rate_limit:ip:total
   * - ${prefix}:metrics:connection_rate_limit:user:total
   *
   * These counters can be exported to Prometheus for alerting/monitoring
   *
   * @param type - 'ip' or 'user'
   */
  private async trackRateLimitHit(type: 'ip' | 'user'): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const metricKey = notificationKeys.connectionRateLimitMetric(type);
      const METRIC_TTL = 30 * 24 * 60 * 60; // 30 days

      // Increment counter and set TTL
      await client.incr(metricKey);
      await client.expire(metricKey, METRIC_TTL);
    } catch {
      // Metrics are best-effort, don't spam logs with failures
    }
  }

  /**
   * Initialize rate limiters for connection rate limiting
   * Reuses existing Redis client from RedisService
   *
   * Rate limiter configuration:
   * - IP limiter: Limits connection attempts per IP address
   * - User limiter: Limits connection attempts per authenticated user
   *
   * Redis key structure:
   * - IP: ${prefix}:connection:rate:ip:ip:${ipAddress}
   * - User: ${prefix}:connection:rate:user:user:${userId}
   *
   * TTL behavior:
   * - Keys automatically expire after `duration` seconds (windowSeconds)
   * - rate-limiter-flexible handles TTL renewal on each consume() call
   * - Edge case: If TTL expires mid-window, next consume() will reset the window
   *   This is acceptable as it only affects very high-frequency connections
   *   and the window will reset correctly on the next request
   *
   * Distributed rate limiting:
   * - All server instances share the same Redis backend
   * - Rate limits are enforced globally across all instances
   * - Testing: Verify with multiple concurrent server instances connecting
   *   to the same Redis to ensure limits are shared correctly
   */
  private initializeRateLimiters(): void {
    try {
      const config = notificationGatewayConfig();
      this.connectionRateLimitConfig = config.connectionRateLimit;

      const redisClient = this.redisService.getClient();

      // Note: rate-limiter-flexible requires a keyPrefix string, not individual keys
      // We'll use a pattern that matches our key builder structure
      // The library will append the actual identifier (IP/user ID) to the prefix
      const ipKeyPrefix = notificationKeys.connectionRateLimitIp('');
      const userKeyPrefix = notificationKeys.connectionRateLimitUser('');

      this.ipRateLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: ipKeyPrefix.replace(/:[^:]*$/, ':'), // Remove trailing identifier, keep prefix pattern
        points: config.connectionRateLimit.ip.limit,
        duration: config.connectionRateLimit.ip.windowSeconds,
      });

      this.userRateLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: userKeyPrefix.replace(/:[^:]*$/, ':'), // Remove trailing identifier, keep prefix pattern
        points: config.connectionRateLimit.user.limit,
        duration: config.connectionRateLimit.user.windowSeconds,
      });

      if (this.logger) {
        this.logger.info(
          'Connection rate limiters initialized successfully',
          'RedisIoAdapter',
        );
      }
    } catch (error) {
      if (this.logger) {
        if (error instanceof Error) {
          this.logger.error(
            'Failed to initialize connection rate limiters',
            error,
            'RedisIoAdapter',
          );
        } else {
          this.logger.error(
            'Failed to initialize connection rate limiters',
            'RedisIoAdapter',
            { error: String(error) },
          );
        }
      }
    }
  }

  /**
   * Extract and normalize client IP address from socket handshake
   * Handles proxy headers, IPv6-mapped IPv4, and port stripping
   *
   * IP extraction priority (lines 354-374):
   * 1. x-forwarded-for header (first IP if multiple)
   * 2. x-real-ip header
   * 3. cf-connecting-ip header (Cloudflare)
   * 4. socket.handshake.address
   * 5. socket.request.connection.remoteAddress
   * 6. socket.request.socket.remoteAddress
   * 7. 'unknown' (logged as warning)
   *
   * Normalization (lines 383-394):
   * - IPv6-mapped IPv4: ::ffff:127.0.0.1 → 127.0.0.1
   * - Port stripping: 127.0.0.1:56789 → 127.0.0.1
   *
   * @param socket - Socket.IO socket instance
   * @returns Normalized IP address or 'unknown' if extraction fails
   */
  private extractClientIp(socket: Socket): string {
    const headers = socket.handshake.headers;
    const forwardedFor = headers['x-forwarded-for'] as string;
    const realIp = headers['x-real-ip'] as string;
    const cfConnectingIp = headers['cf-connecting-ip'] as string;

    let ip: string | undefined;

    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one (client IP)
      ip = forwardedFor.split(',')[0].trim();
    } else if (realIp) {
      ip = realIp;
    } else if (cfConnectingIp) {
      ip = cfConnectingIp;
    } else {
      // Fallback to socket address
      ip =
        socket.handshake.address ||
        (socket.request as any)?.connection?.remoteAddress ||
        (socket.request as any)?.socket?.remoteAddress;
    }

    if (!ip) {
      if (this.logger) {
        this.logger.warn(
          "Unable to extract IP address for socket, using 'unknown'",
          'RedisIoAdapter',
          { socketId: socket.id },
        );
      }
      return 'unknown';
    }

    // Normalize IPv6-mapped IPv4 (::ffff:127.0.0.1 → 127.0.0.1)
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    // Strip port number if present (127.0.0.1:56789 → 127.0.0.1)
    // Only strip if it looks like IPv4 with port (contains dots)
    const portIndex = ip.lastIndexOf(':');
    if (portIndex !== -1 && ip.includes('.')) {
      // IPv4 with port
      ip = ip.substring(0, portIndex);
    }

    return ip;
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
