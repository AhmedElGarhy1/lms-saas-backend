import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  ErrorDetail,
  EnhancedErrorResponse,
} from '../exceptions/custom.exceptions';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      catchError((error) => {
        // Log the error with context
        this.logger.error(
          `Error in ${method} ${url}: ${error.message}`,
          error.stack,
          {
            method,
            url,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
            userId: request.user?.id,
          },
        );

        // Handle different types of errors
        if (error instanceof HttpException) {
          // HTTP exceptions are already properly formatted
          return throwError(() => error);
        }

        // Handle database errors
        if (error.code === '23505') {
          // Unique constraint violation
          const field = error.detail?.match(/Key \((.+)\)=/)?.[1] || 'field';
          const value =
            error.detail?.match(/Key \(.+\)=\((.+)\)/)?.[1] || 'value';

          const details: ErrorDetail[] = [
            {
              field,
              value,
              message: `${field} is already taken`,
              code: 'DUPLICATE_FIELD',
              suggestion: `Choose a different ${field}`,
            },
          ];

          const httpError = new HttpException(
            {
              statusCode: HttpStatus.CONFLICT,
              message: `${field} already exists`,
              error: 'Conflict',
              timestamp: new Date().toISOString(),
              path: url,
              method,
              userMessage: `This ${field} is already in use. Please choose a different one.`,
              actionRequired: `Please use a different ${field}.`,
              retryable: false,
              details,
            } as EnhancedErrorResponse,
            HttpStatus.CONFLICT,
          );
          return throwError(() => httpError);
        }

        if (error.code === '23503') {
          // Foreign key constraint violation
          const details: ErrorDetail[] = [
            {
              field: 'database',
              value: 'unknown',
              message: 'Referenced record does not exist',
              code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
              suggestion: 'Check that all referenced records exist',
            },
          ];

          const httpError = new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Referenced record does not exist',
              error: 'Bad Request',
              timestamp: new Date().toISOString(),
              path: url,
              method,
              userMessage: 'One or more referenced items do not exist.',
              actionRequired: 'Please check your selection and try again.',
              retryable: false,
              details,
            } as EnhancedErrorResponse,
            HttpStatus.BAD_REQUEST,
          );
          return throwError(() => httpError);
        }

        if (error.code === '42P01') {
          // Table does not exist
          const details: ErrorDetail[] = [
            {
              field: 'database',
              value: 'unknown',
              message: 'Database configuration error',
              code: 'TABLE_NOT_FOUND',
              suggestion: 'Contact system administrator',
            },
          ];

          const httpError = new HttpException(
            {
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              message: 'Database configuration error',
              error: 'Internal Server Error',
              timestamp: new Date().toISOString(),
              path: url,
              method,
              userMessage: 'A system error occurred. Please try again later.',
              actionRequired: 'If the problem persists, contact support.',
              retryable: true,
              details,
            } as EnhancedErrorResponse,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
          return throwError(() => httpError);
        }

        // Handle TypeORM errors
        if (error.name === 'QueryFailedError') {
          const details: ErrorDetail[] = [
            {
              field: 'database',
              value: 'unknown',
              message: 'Database operation failed',
              code: 'QUERY_FAILED',
              suggestion:
                'Please try again or contact support if the problem persists',
            },
          ];

          const httpError = new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Database operation failed',
              error: 'Bad Request',
              timestamp: new Date().toISOString(),
              path: url,
              method,
              userMessage:
                'The operation could not be completed. Please try again.',
              actionRequired: 'If the problem persists, contact support.',
              retryable: true,
              details,
            } as EnhancedErrorResponse,
            HttpStatus.BAD_REQUEST,
          );
          return throwError(() => httpError);
        }

        // Handle EntityNotFoundError
        if (error.name === 'EntityNotFoundError') {
          const details: ErrorDetail[] = [
            {
              field: 'id',
              value: 'unknown',
              message: 'Record not found',
              code: 'ENTITY_NOT_FOUND',
              suggestion: 'Check the ID or try refreshing the page',
            },
          ];

          const httpError = new HttpException(
            {
              statusCode: HttpStatus.NOT_FOUND,
              message: 'Record not found',
              error: 'Not Found',
              timestamp: new Date().toISOString(),
              path: url,
              method,
              userMessage: 'The requested item could not be found.',
              actionRequired: 'Please check the ID or try refreshing the page.',
              retryable: false,
              details,
            } as EnhancedErrorResponse,
            HttpStatus.NOT_FOUND,
          );
          return throwError(() => httpError);
        }

        // Default error handling
        const details: ErrorDetail[] = [
          {
            field: 'system',
            value: 'unknown',
            message: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR',
            suggestion:
              'Please try again or contact support if the problem persists',
          },
        ];

        const httpError = new HttpException(
          {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            error: 'Internal Server Error',
            timestamp: new Date().toISOString(),
            path: url,
            method,
            userMessage: 'Something went wrong. Please try again.',
            actionRequired: 'If the problem persists, contact support.',
            retryable: true,
            details,
          } as EnhancedErrorResponse,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );

        return throwError(() => httpError);
      }),
    );
  }
}
