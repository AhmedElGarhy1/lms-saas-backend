import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to preserve raw request body for webhook signature verification
 * Must be applied before body parser to capture raw bytes
 */
@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Only preserve raw body for WhatsApp webhook endpoint
    if (
      req.path === '/notifications/webhooks/whatsapp' &&
      req.method === 'POST'
    ) {
      let data = '';
      req.setEncoding('utf8');

      req.on('data', (chunk) => {
        data += chunk;
      });

      req.on('end', () => {
        // Store raw body in request object for signature verification
        (req as any).rawBody = data;
        next();
      });
    } else {
      next();
    }
  }
}
