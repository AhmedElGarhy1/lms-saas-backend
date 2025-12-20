import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface PerformanceMetrics {
  method: string;
  url: string;
  userId?: string;
  duration: number;
  statusCode: number;
  timestamp: string;
}

interface ErrorWithStatus {
  status?: number;
  message?: string;
  stack?: string;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    const method = request.method;
    const url = request.url;
    const userId = request.user?.id;

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const statusCode = response.statusCode;

          const metrics: PerformanceMetrics = {
            method,
            url,
            userId,
            duration,
            statusCode,
            timestamp: new Date().toISOString(),
          };

          // Log performance metrics for slow requests (> 1000ms)
          if (duration > 1000) {
            console.warn('Slow request detected:', metrics);
          }

          // Log all requests for monitoring
          console.log('Request completed:', metrics);
        },
        error: (error: ErrorWithStatus) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const statusCode = error.status || 500;

          const metrics: PerformanceMetrics = {
            method,
            url,
            userId,
            duration,
            statusCode,
            timestamp: new Date().toISOString(),
          };

          // 304 Not Modified is a success response, not an error - log as success
          if (statusCode === 304) {
            console.log('Request completed:', metrics);
          } else {
            // Log error performance metrics for actual errors
          console.error('Request failed:', {
            ...metrics,
            error: error.message || 'Unknown error',
            stack: error.stack,
          });
          }
        },
      }),
    );
  }
}
