import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitConfig } from '../interfaces/rate-limit-config.interface';
import {
  X_RATE_LIMIT_LIMIT,
  X_RATE_LIMIT_REMAINING,
  X_RATE_LIMIT_RESET,
  RETRY_AFTER,
} from '../constants/rate-limit.constants';
import { RATE_LIMIT_METADATA } from '../decorators/rate-limit.decorator';

/**
 * Rate limit guard for HTTP endpoints
 * Replaces ThrottlerGuard functionality with unified rate limit service
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this is an HTTP context
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    // Get rate limit configuration from decorator metadata
    const config = this.reflector.getAllAndOverride<Partial<RateLimitConfig>>(
      RATE_LIMIT_METADATA,
      [context.getHandler(), context.getClass()],
    );

    // If no config, allow request (no rate limiting)
    if (!config) {
      return true;
    }

    // Build rate limit key from IP or user ID
    const key = this.buildKey(request);

    // Get limit and window from config
    const limit = config.limit;
    const windowSeconds = config.windowSeconds;

    if (!limit || !windowSeconds) {
      this.logger.warn(
        `Rate limit config missing limit or windowSeconds for ${request.path}`,
      );
      return true;
    }

    try {
      // Check rate limit
      const result = await this.rateLimitService.checkLimit(
        key,
        limit,
        windowSeconds,
        {
          context: 'http',
          identifier: key,
        },
      );

      // Set rate limit headers (Express and Fastify compatible)
      this.setRateLimitHeaders(response, result, limit);

      if (!result.allowed) {
        // Rate limit exceeded
        // Calculate exact remaining time from resetTime (most accurate)
        // retryAfter is in milliseconds, but resetTime gives exact timestamp
        let retryAfterSeconds: number;
        if (result.resetTime) {
          const now = Date.now();
          const remainingMs = result.resetTime - now;
          retryAfterSeconds = Math.max(1, Math.round(remainingMs / 1000));
        } else if (result.retryAfter) {
          // Fallback to retryAfter if resetTime not available
          retryAfterSeconds = Math.max(1, Math.round(result.retryAfter / 1000));
        } else {
          // Last resort: use window size
          retryAfterSeconds = windowSeconds;
        }

        // Set Retry-After header (RFC 7231 requires seconds)
        response.setHeader(RETRY_AFTER, retryAfterSeconds.toString());

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests',
            retryAfter: retryAfterSeconds,
            resetTime: result.resetTime, // Pass resetTime for dynamic calculation
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      // If it's already an HttpException, rethrow it
      if (error instanceof HttpException) {
        throw error;
      }

      // For other errors, log and allow (fail open by default)
      this.logger.error(
        `Rate limit check failed for ${request.path}: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Fail open: allow request on error
      return true;
    }
  }

  /**
   * Build rate limit key from request
   * Priority: user ID > IP address
   */
  private buildKey(request: Request): string {
    // Try to get user ID from request (if authenticated)
    const user = (request as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }

    // Fallback to IP address
    return `ip:${this.extractIp(request)}`;
  }

  /**
   * Extract client IP address from request
   * Handles proxy headers and load balancers
   */
  private extractIp(request: Request): string {
    // Check for IP in various headers (for proxies, load balancers, etc.)
    const forwardedFor = request.get('x-forwarded-for');
    const realIp = request.get('x-real-ip');
    const cfConnectingIp = request.get('cf-connecting-ip'); // Cloudflare

    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwardedFor.split(',')[0].trim();
    }

    if (realIp) {
      return realIp;
    }

    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    // Fallback to connection remote address
    return (
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Set rate limit headers on response
   * Compatible with both Express and Fastify
   */
  private setRateLimitHeaders(
    response: Response,
    result: { limit: number; remaining: number; resetTime?: number },
    limit: number,
  ): void {
    // Set standard rate limit headers
    response.setHeader(X_RATE_LIMIT_LIMIT, limit.toString());
    response.setHeader(
      X_RATE_LIMIT_REMAINING,
      Math.max(0, result.remaining).toString(),
    );

    if (result.resetTime) {
      // Convert to Unix timestamp (seconds)
      const resetTimestamp = Math.floor(result.resetTime / 1000);
      response.setHeader(X_RATE_LIMIT_RESET, resetTimestamp.toString());
    }
  }
}
