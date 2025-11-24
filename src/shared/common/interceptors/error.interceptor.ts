import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  ErrorDetail,
  EnhancedErrorResponse,
} from '../exceptions/custom.exceptions';
import { ErrorCode } from '../enums/error-codes.enum';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  constructor(private readonly i18n: I18nService<I18nTranslations>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      catchError((error) => {
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
              code: ErrorCode.DUPLICATE_FIELD,
              suggestion: `Choose a different ${field}`,
            },
          ];

          const message = this.i18n.translate('t.errors.duplicateField', {
            args: { field },
          });

          const httpError = new HttpException(
            {
              statusCode: HttpStatus.CONFLICT,
              message,
              error: 'Conflict',
              timestamp: new Date().toISOString(),
              path: url,
              method,
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
              code: ErrorCode.FOREIGN_KEY_CONSTRAINT_VIOLATION,
              suggestion: 'Check that all referenced records exist',
            },
          ];

          const message = this.i18n.translate('t.errors.foreignKeyViolation');

          const httpError = new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message,
              error: 'Bad Request',
              timestamp: new Date().toISOString(),
              path: url,
              method,
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
              code: ErrorCode.TABLE_NOT_FOUND,
              suggestion: 'Contact system administrator',
            },
          ];

          const message = this.i18n.translate(
            't.errors.databaseConfigurationError',
          );

          const httpError = new HttpException(
            {
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              message,
              error: 'Internal Server Error',
              timestamp: new Date().toISOString(),
              path: url,
              method,
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
              code: ErrorCode.QUERY_FAILED,
              suggestion:
                'Please try again or contact support if the problem persists',
            },
          ];

          const message = this.i18n.translate(
            't.errors.databaseOperationFailed',
          );

          const httpError = new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message,
              error: 'Bad Request',
              timestamp: new Date().toISOString(),
              path: url,
              method,
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
              code: ErrorCode.ENTITY_NOT_FOUND,
              suggestion: 'Check the ID or try refreshing the page',
            },
          ];

          const message = this.i18n.translate('t.errors.recordNotFound');

          const httpError = new HttpException(
            {
              statusCode: HttpStatus.NOT_FOUND,
              message,
              error: 'Not Found',
              timestamp: new Date().toISOString(),
              path: url,
              method,
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
            code: ErrorCode.INTERNAL_ERROR,
            suggestion:
              'Please try again or contact support if the problem persists',
          },
        ];

        const message = this.i18n.translate('t.errors.internalServerError');

        const httpError = new HttpException(
          {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message,
            error: 'Internal Server Error',
            timestamp: new Date().toISOString(),
            path: url,
            method,
            details,
          } as EnhancedErrorResponse,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );

        return throwError(() => httpError);
      }),
    );
  }
}
