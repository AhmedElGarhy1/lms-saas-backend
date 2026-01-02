/**
 * TypeORM exception filter
 * Converts database errors (QueryFailedError, EntityNotFoundError) to custom exceptions
 * and re-throws them for GlobalExceptionFilter to handle.
 *
 * Translation and response formatting is handled by GlobalExceptionFilter.
 * This filter only converts database-specific errors to domain exceptions.
 */
import {
  ExceptionFilter,
  HttpException,
  Injectable,
  Catch,
  Logger,
} from '@nestjs/common';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { CommonErrors } from '../exceptions/common.errors';
import { SystemErrors } from '../exceptions/system.exception';
import {
  DATABASE_ERROR_CODES,
  ERROR_MESSAGES,
  isDatabaseErrorCode,
} from '../constants/database-errors.constants';

@Injectable()
@Catch(QueryFailedError, EntityNotFoundError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);

  /**
   * Handle TypeORM exceptions
   * @param exception - TypeORM exception (QueryFailedError or EntityNotFoundError)
   * @param _host - NestJS execution context
   * @throws HttpException - Re-throws converted custom exception
   */
  catch(exception: unknown) {
    this.logger.debug(
      `TypeOrmExceptionFilter caught: ${exception?.constructor?.name}`,
    );

    let httpException: HttpException;

    if (exception instanceof EntityNotFoundError) {
      httpException = SystemErrors.internalServerError({
        operation: 'entity_not_found',
        component: 'database',
      });
    } else if (exception instanceof QueryFailedError) {
      interface PostgresDriverError {
        code?: string;
        errno?: number;
        name?: string;
        detail?: string;
        constraint?: string;
      }

      const drv =
        ((exception as QueryFailedError).driverError as PostgresDriverError) ||
        {};
      const code = drv.code || drv.errno || drv.name;

      if (isDatabaseErrorCode(code, DATABASE_ERROR_CODES.UNIQUE_VIOLATION)) {
        // Unique constraint violation
        const detail = drv.detail || '';
        const constraintName = drv.constraint || '';

        let field = this.extractFieldFromConstraint(constraintName);
        if (!field) {
          const match = detail.match(/Key \((.+?)\)=\((.+?)\)/);
          field = match ? match[1] : 'field';
        }

        // Extract field name from error detail for translation
        // Pass field as translation key - GlobalExceptionFilter will translate it
        httpException = SystemErrors.internalServerError({
          operation: 'unique_constraint_violation',
          component: 'database',
          field,
          constraint: drv.constraint,
        });
      } else if (
        isDatabaseErrorCode(code, DATABASE_ERROR_CODES.EXCLUSION_VIOLATION)
      ) {
        // Exclusion constraint violation (e.g., overlapping session times)
        // This handles the database-level protection against double-booking
        // that prevents race conditions in high-concurrency scenarios
        const constraintName = drv.constraint || '';

        // Check if this is the session overlap constraint
        if (constraintName.includes('groupId_timeRange_exclusion')) {
          httpException = SystemErrors.internalServerError({
            operation: 'database_constraint_validation',
            error: 'exclusion_constraint_violation',
            constraint: drv.constraint,
          });
        } else {
          // Generic exclusion violation
          httpException = SystemErrors.internalServerError({
            operation: 'database_operation',
            error: 'exclusion_violation',
            constraint: constraintName,
          });
        }
      } else if (
        isDatabaseErrorCode(code, DATABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION)
      ) {
        // Foreign key violation
        httpException = SystemErrors.internalServerError({
          operation: 'database_operation',
          error: 'foreign_key_violation',
          constraint: drv.constraint,
        });
      } else if (isDatabaseErrorCode(code, DATABASE_ERROR_CODES.DEADLOCK)) {
        // Deadlock/transaction conflict
        httpException = SystemErrors.serviceUnavailable('database');
      } else {
        // Unknown database error
        httpException = SystemErrors.internalServerError({
          operation: 'database_operation',
          error: 'unknown_database_error',
          code: code,
        });
      }
    } else {
      return;
    }

    // Re-throw the exception - let GlobalExceptionFilter handle translation and formatting
    throw httpException;
  }

  /**
   * Extract field name from database constraint name
   * @param constraintName - Database constraint name (e.g., "UQ_users_phone")
   * @returns Field name or null if not found
   */
  private extractFieldFromConstraint(constraintName: string): string | null {
    if (!constraintName) return null;
    const match = constraintName.match(/(?:UQ|IDX)_\w+_(.+)/);
    return match ? match[1] : null;
  }
}
