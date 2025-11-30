import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';
import {
  MissingRequiredHeaderException,
  InvalidContentTypeException,
  RequestBodyTooLargeException,
  UnsupportedContentTypeException,
} from '../exceptions/custom.exceptions';
import { I18nPath } from '@/generated/i18n.generated';

@Injectable()
export class RequestValidationMiddleware implements NestMiddleware {
  private readonly logger: Logger = new Logger(
    RequestValidationMiddleware.name,
  );

  constructor(private readonly moduleRef: ModuleRef) {}

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Validate request headers
      this.validateHeaders(req);

      // Validate request body size
      this.validateBodySize(req);

      // Validate content type for POST/PUT requests
      this.validateContentType(req);

      // Log request for security audit
      this.logRequest(req);

      next();
    } catch (error) {
      this.logger.error(
        `Request validation failed - url: ${req.url}, method: ${req.method}, ip: ${req.ip}, userAgent: ${req.get('User-Agent')}`,
        error instanceof Error ? error.stack : String(error),
      );

      res.status(400).json({
        error: 'Invalid request',
        message: error.message,
      });
    }
  }

  private validateHeaders(req: Request): void {
    // Check for required headers
    const requiredHeaders = ['user-agent'];
    for (const header of requiredHeaders) {
      if (!req.get(header)) {
        throw new MissingRequiredHeaderException(
          header,
          't.errors.missingRequiredHeader',
          { header: header as I18nPath },
        );
      }
    }

    // Validate content-type for requests with body
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new InvalidContentTypeException('t.errors.invalid.type', {
          field: 'Content-Type' as I18nPath,
        });
      }
    }
  }

  private validateBodySize(req: Request): void {
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSize = 1024 * 1024; // 1MB

    if (contentLength > maxSize) {
      throw new RequestBodyTooLargeException('t.errors.requestBodyTooLarge');
    }
  }

  private validateContentType(req: Request): void {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        throw new UnsupportedContentTypeException('t.errors.unsupportedContentType');
      }
    }
  }

  private logRequest(req: Request): void {
    // Request logging handled by PerformanceInterceptor
  }
}
