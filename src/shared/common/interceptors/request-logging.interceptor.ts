import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { EnterpriseLoggerService } from '../services/enterprise-logger.service';
import { RequestContextService } from '../services/request-context.service';
import { ActorUser } from '../types/actor-user.type';

/**
 * Enterprise-grade request logging interceptor
 * Provides comprehensive request/response logging with correlation IDs
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(
    private readonly enterpriseLogger: EnterpriseLoggerService,
    private readonly requestContext: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Set correlation ID in response headers for client tracking
    const correlationId = this.requestContext.getCorrelationId();
    response.setHeader('X-Correlation-ID', correlationId);
    response.setHeader('X-Request-ID', this.requestContext.getRequestId());

    // Extract user from request if available
    const user = this.extractUserFromRequest(request);

    // Log request start
    this.enterpriseLogger.logRequestStart(request, user);

    // Add correlation ID to request for use in services
    (request as any).correlationId = correlationId;
    (request as any).requestId = this.requestContext.getRequestId();

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Log successful response
          this.enterpriseLogger.logRequestComplete(request, response, user);
        },
        error: (error) => {
          // Log error response
          try {
            this.enterpriseLogger.logHttpException(
              error,
              request,
              error.status || 500,
              user,
            );

            // Ensure response is still logged as complete
            this.enterpriseLogger.logRequestComplete(request, response, user);
          } catch (loggerError) {
            // Fallback logging if the main logger fails
            console.error('CRITICAL: Failed to log HttpException:', {
              errorContext: {
                method: request.method,
                url: request.url,
                userAgent: request.get('User-Agent'),
                ip: request.ip,
                statusCode: error.status || 500,
                message: error.message || 'Unknown error',
              },
              exception: error.message || error,
              loggerError: loggerError?.message || String(loggerError),
            });
          }
        },
      }),
    );
  }

  /**
   * Extract user information from request
   */
  private extractUserFromRequest(request: Request): ActorUser | undefined {
    // Check if user is attached by authentication guard
    if (request.user) {
      return request.user as ActorUser;
    }

    // Check if user is in request object (set by other interceptors)
    if ((request as any).actor) {
      return (request as any).actor as ActorUser;
    }

    return undefined;
  }
}
