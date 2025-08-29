import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly rateLimitStore = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(private readonly config: RateLimitConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const clientId = this.getClientId(request);
    const now = Date.now();

    // Get or create rate limit entry for this client
    const rateLimitEntry = this.rateLimitStore.get(clientId);

    if (!rateLimitEntry || now > rateLimitEntry.resetTime) {
      // Reset rate limit for this client
      this.rateLimitStore.set(clientId, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    // Check if client has exceeded rate limit
    if (rateLimitEntry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((rateLimitEntry.resetTime - now) / 1000);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: this.config.message || 'Rate limit exceeded',
          error: 'Too Many Requests',
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          userMessage: 'You have made too many requests',
          actionRequired: `Please wait ${retryAfter} seconds before trying again`,
          retryable: true,
          details: [
            {
              field: 'rate_limit',
              value: clientId,
              message: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              suggestion: `Wait ${retryAfter} seconds before trying again`,
            },
          ],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment request count
    rateLimitEntry.count++;
    return true;
  }

  private getClientId(request: RequestWithUser): string {
    const ip = (request as Request & { ip?: string }).ip || 'unknown';
    const userId = request.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }

  // Clean up expired entries periodically
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}
