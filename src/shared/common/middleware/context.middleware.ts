// context.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContext } from '../context/request.context';
import { IRequest } from '../interfaces/request.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: IRequest, res: Response, next: NextFunction) {
    const user = req.user;
    const centerId = req.centerId;

    // Extract IP address (considering proxies and load balancers)
    const ipAddress = this.getClientIpAddress(req);

    // Extract User-Agent
    const userAgent = req.get('user-agent') || 'Unknown';

    // Generate unique request ID for tracking
    const requestId = randomUUID();

    RequestContext.set({
      centerId,
      ipAddress,
      userAgent,
      requestId,
    });
    next();
  }

  private getClientIpAddress(req: Request): string {
    // Check for IP in various headers (for proxies, load balancers, etc.)
    const forwardedFor = req.get('x-forwarded-for');
    const realIp = req.get('x-real-ip');
    const cfConnectingIp = req.get('cf-connecting-ip'); // Cloudflare

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
      req.connection?.remoteAddress || req.socket?.remoteAddress || 'Unknown'
    );
  }
}
