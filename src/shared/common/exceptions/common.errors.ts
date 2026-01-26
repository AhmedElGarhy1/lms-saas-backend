import { DomainException, BaseErrorHelpers } from './domain.exception';
import { CommonErrorCode } from '../enums/error-codes';

/**
 * Common/generic error helpers
 * Used across multiple modules for shared error scenarios
 */
export class CommonErrors extends BaseErrorHelpers {
  static tooManyAttempts(): DomainException {
    return this.createNoDetails(CommonErrorCode.TOO_MANY_ATTEMPTS);
  }

  // Emergency fallbacks - use sparingly
  static emergencyNotFound(
    entity: string,
    entityId?: string | number,
  ): DomainException {
    return this.createWithDetails(CommonErrorCode.RESOURCE_NOT_FOUND, {
      field: entity,
      value: entityId,
    });
  }

  static validationFailed(field: string, value: unknown): DomainException {
    return this.createWithDetails(CommonErrorCode.VALIDATION_FAILED, {
      field,
      value,
    });
  }

  static validationErrors(
    validationErrors: Record<
      string,
      Array<{ constraint: string; params?: Record<string, any> }>
    >,
  ): DomainException {
    return this.createWithDetails(CommonErrorCode.VALIDATION_FAILED, {
      validationErrors,
    });
  }

  // Generic resource not found (for cross-cutting concerns)
  static resourceNotFound(
    entity: string,
    entityId?: string | number,
  ): DomainException {
    return this.createWithDetails(CommonErrorCode.RESOURCE_NOT_FOUND, {
      field: entity,
      value: entityId,
    });
  }

  // Cannot target self error (for cross-cutting concerns)
  static cannotTargetSelf(): DomainException {
    return this.createNoDetails(CommonErrorCode.CANNOT_TARGET_SELF);
  }
}
