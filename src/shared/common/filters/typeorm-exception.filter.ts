/**
 * TypeORM exception filter
 * Converts database errors (QueryFailedError, EntityNotFoundError) to custom exceptions
 * and re-throws them for GlobalExceptionFilter to handle.
 *
 * Translation and response formatting is handled by GlobalExceptionFilter.
 * This filter only converts database-specific errors to domain exceptions.
 */
import {
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  Injectable,
  Catch,
  Logger,
} from '@nestjs/common';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { I18nPath } from '@/generated/i18n.generated';
import {
  ResourceNotFoundException,
  BusinessLogicException,
  ServiceUnavailableException,
  ResourceAlreadyExistsException,
} from '../exceptions/custom.exceptions';
import {
  DATABASE_ERROR_CODES,
  TRANSLATION_KEYS,
  isDatabaseErrorCode,
} from '../constants/database-errors.constants';

@Injectable()
@Catch(QueryFailedError, EntityNotFoundError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);

  /**
   * Handle TypeORM exceptions
   * @param exception - TypeORM exception (QueryFailedError or EntityNotFoundError)
   * @param host - NestJS execution context
   * @throws HttpException - Re-throws converted custom exception
   */
  catch(exception: unknown, host: ArgumentsHost) {
    this.logger.debug(
      `TypeOrmExceptionFilter caught: ${exception?.constructor?.name}`,
    );

    let httpException: HttpException;

    if (exception instanceof EntityNotFoundError) {
      httpException = new ResourceNotFoundException(
        TRANSLATION_KEYS.ERRORS.RESOURCE_NOT_FOUND,
      );
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

        const match = detail.match(/Key \((.+?)\)=\((.+?)\)/);
        const value = match ? match[2] : '';

        // Pass field as translation key - GlobalExceptionFilter will translate it
        httpException = new ResourceAlreadyExistsException(
          TRANSLATION_KEYS.ERRORS.DUPLICATE_FIELD,
          {
            field: `t.common.labels.${field || 'field'}` as I18nPath,
            value: value as I18nPath | number,
          },
        );
      } else if (
        isDatabaseErrorCode(code, DATABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION)
      ) {
        // Foreign key violation
        httpException = new BusinessLogicException(
          TRANSLATION_KEYS.ERRORS.RELATED_ENTITY_MISSING_OR_INVALID,
        );
      } else if (isDatabaseErrorCode(code, DATABASE_ERROR_CODES.DEADLOCK)) {
        // Deadlock/transaction conflict
        httpException = new ServiceUnavailableException(
          TRANSLATION_KEYS.ERRORS.TEMPORARY_DATABASE_CONFLICT,
        );
      } else {
        // Unknown database error
        httpException = new BusinessLogicException(
          TRANSLATION_KEYS.ERRORS.DATABASE_OPERATION_FAILED,
        );
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
