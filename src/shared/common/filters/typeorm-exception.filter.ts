/**
 * Global TypeORM/Nest mapping with retry hints for clients.
 */
import {
  ArgumentsHost,
  ExceptionFilter,
  HttpStatus,
  Injectable,
  Catch,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import {
  ResourceNotFoundException,
  BusinessLogicException,
  ServiceUnavailableException,
  ValidationFailedException,
  ResourceAlreadyExistsException,
} from '../exceptions/custom.exceptions';
import { ErrorCode } from '../enums/error-codes.enum';

@Injectable()
@Catch(QueryFailedError, EntityNotFoundError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // Debug: Log what type of exception we're getting
    console.log('TypeOrmExceptionFilter caught:', {
      type: exception?.constructor?.name,
      message: exception instanceof Error ? exception.message : 'Unknown',
      isEntityNotFound: exception instanceof EntityNotFoundError,
      isQueryFailed: exception instanceof QueryFailedError,
    });

    // Entity not found → 404 (from findOneOrFail etc.)
    if (exception instanceof EntityNotFoundError) {
      const notFoundException = new ResourceNotFoundException('t.errors.resourceNotFound');
      return res
        .status(notFoundException.getStatus())
        .json(notFoundException.getResponse());
    }

    // TypeORM query failure with vendor codes
    if (exception instanceof QueryFailedError) {
      const drv: any = (exception as any).driverError || {};
      const code = drv.code || drv.errno || drv.name; // pg | mysql | generic
      const constraint = drv.constraint; // pg

      switch (code) {
        // PostgreSQL
        case '23505': // unique_violation
        case 'ER_DUP_ENTRY': // MySQL duplicate
        case 1062: // MySQL numeric
          const conflictException = new ResourceAlreadyExistsException(
            't.errors.duplicateResource',
            constraint ? { constraint } : undefined,
          );
          return res
            .status(conflictException.getStatus())
            .json(conflictException.getResponse());

        case '23503': // foreign_key_violation (pg)
        case 'ER_NO_REFERENCED_ROW_2':
        case 1452:
          const businessException = new BusinessLogicException(
            't.errors.relatedEntityMissingOrInvalid',
          );
          return res
            .status(businessException.getStatus())
            .json(businessException.getResponse());

        case '23502': // not_null_violation (pg)
          const validationException = new ValidationFailedException(
            't.errors.requiredFieldMissing',
            [
              {
                field: 'unknown',
                value: '',
                message: 'A required field is missing',
                code: ErrorCode.REQUIRED_FIELD_MISSING,
                suggestion: 'Please fill in all required fields',
              },
            ],
          );
          return res
            .status(validationException.getStatus())
            .json(validationException.getResponse());

        // Transient / retryable
        case '40001': // serialization_failure (pg)
        case '40P01': // deadlock_detected (pg)
          const serviceException = new ServiceUnavailableException(
            't.errors.temporaryDatabaseConflict',
          );
          return res
            .status(serviceException.getStatus())
            .json(serviceException.getResponse());
      }

      // Fallback for anything else
      const fallbackException = new ServiceUnavailableException(
        't.errors.databaseOperationFailed',
      );
      return res
        .status(fallbackException.getStatus())
        .json(fallbackException.getResponse());
    }

    // If it's not a TypeORM error, let other filters handle it
    return;
  }
}
