import {
  Injectable,
  NestMiddleware,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WebhookProvider } from '../enums/webhook-provider.enum';

@Injectable()
export class WebhookSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(WebhookSecurityMiddleware.name);

  // Known IP ranges for webhook providers (add to config)
  private readonly ALLOWED_IPS = {
    [WebhookProvider.PAYMOB]: [
      '41.33.160.0/19', // Paymob IP range - should be verified and updated
      '156.200.0.0/16', // Additional Paymob IP range
    ],
  };

  private requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly RATE_LIMIT = 100; // requests per minute per IP
  private readonly RATE_WINDOW = 60 * 1000; // 1 minute

  use(req: Request, res: Response, next: NextFunction) {
    try {
      const clientIP = this.getClientIP(req);
      const provider = this.getProviderFromPath(req.path);

      // 1. IP Whitelisting
      if (!this.isAllowedIP(clientIP, provider)) {
        this.logger.warn(
          `Blocked webhook from unauthorized IP: ${clientIP} for ${provider}`,
        );
        throw new BadRequestException('Unauthorized IP address');
      }

      // 2. Rate Limiting
      if (!this.checkRateLimit(clientIP)) {
        this.logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
        throw new BadRequestException('Rate limit exceeded');
      }

      // 3. Basic Payload Validation
      if (!req.body || typeof req.body !== 'object') {
        throw new BadRequestException('Invalid webhook payload');
      }

      // Add security headers to response
      res.setHeader('X-Webhook-Security', 'validated');

      this.logger.log(`Webhook security validated: ${clientIP} -> ${provider}`);
      next();
    } catch (error) {
      this.logger.error('Webhook security validation failed', error);
      throw error;
    }
  }

  private getClientIP(req: Request): string {
    // Check for forwarded headers first (for proxies/load balancers)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      return Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0].trim();
    }

    // Check for other proxy headers
    const realIP = req.headers['x-real-ip'];
    if (realIP && typeof realIP === 'string') {
      return realIP;
    }

    // Fallback to connection remote address
    return (
      req.connection.remoteAddress || req.socket.remoteAddress || 'unknown'
    );
  }

  private getProviderFromPath(path: string): WebhookProvider {
    if (path.includes('/paymob')) {
      return WebhookProvider.PAYMOB;
    }
    throw new BadRequestException('Unknown webhook provider');
  }

  private isAllowedIP(ip: string, provider: WebhookProvider): boolean {
    // TODO: Replace with proper CIDR library like 'ipaddr.js' or 'cidr-tools'
    // TODO: Move ALLOWED_IPS to configuration service
    const allowedIPs = this.ALLOWED_IPS[provider] || [];

    return allowedIPs.some((allowedIP) => {
      if (allowedIP.includes('/')) {
        // Handle CIDR notation properly
        return this.isIPInCIDR(ip, allowedIP);
      }
      return ip === allowedIP;
    });
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    // TODO: Implement proper CIDR checking
    // For now, simple /32 check
    if (cidr.endsWith('/32')) {
      return ip === cidr.replace('/32', '');
    }
    // TODO: Add proper CIDR range checking
    return false;
  }

  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const key = `${ip}`;

    let rateData = this.requestCounts.get(key);

    if (!rateData || now > rateData.resetTime) {
      // Reset or initialize rate data
      rateData = {
        count: 1,
        resetTime: now + this.RATE_WINDOW,
      };
      this.requestCounts.set(key, rateData);
      return true;
    }

    if (rateData.count >= this.RATE_LIMIT) {
      return false; // Rate limit exceeded
    }

    rateData.count++;
    return true;
  }
}
