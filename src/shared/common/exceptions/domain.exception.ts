import { HttpException, HttpStatus } from '@nestjs/common';
import { AllErrorCodes, CommonErrorCode } from '../enums/error-codes';
export { SystemException, SystemErrors } from './system.exception';

/**
 * Fully typed domain exception with compile-time guarantees
 * Ensures each error code gets exactly the details it requires
 */
// Simple domain exception for business logic errors
export class DomainException extends HttpException {
  constructor(
    public readonly errorCode: AllErrorCodes,
    public readonly details?: any[], // Keep simple - can be improved later
    statusCode: number = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        errorCode,
        type: 'domain_error',
        timestamp: new Date().toISOString(),
        ...(details && details.length > 0 && { details }),
      },
      statusCode,
    );
  }
}

// Base class that modules can extend to get proper typing
// Each module should implement its own create methods with proper overloads
export abstract class BaseErrorHelpers {
  // Basic helper methods that modules can use
  protected static createNoDetails(
    errorCode: AllErrorCodes,
    statusCode?: number,
  ): DomainException {
    return new DomainException(errorCode, [], statusCode);
  }

  protected static createWithDetails(
    errorCode: AllErrorCodes,
    details: any,
    statusCode?: number,
  ): DomainException {
    return new DomainException(errorCode, [details], statusCode);
  }
}

// Common domain errors - use for cross-cutting concerns
export class DomainErrors {
  static resourceNotFound(
    entity: string,
    entityId?: string | number,
  ): DomainException {
    return new DomainException(CommonErrorCode.RESOURCE_NOT_FOUND, [
      {
        field: entity,
        value: entityId,
      },
    ]);
  }

  static validationFailed(field: string, value: unknown): DomainException {
    return new DomainException(CommonErrorCode.VALIDATION_FAILED, [
      {
        field,
        value,
      },
    ]);
  }

  static cannotTargetSelf(operation?: string): DomainException {
    return new DomainException(CommonErrorCode.CANNOT_TARGET_SELF, [
      {
        operation: operation || 'unknown',
      },
    ]);
  }
}
