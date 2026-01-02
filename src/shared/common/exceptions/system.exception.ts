import { HttpException, HttpStatus } from '@nestjs/common';
import { CommonErrorCode } from '../enums/error-codes';

export interface SystemErrorMetadata {
  component?: string; // e.g., 'database', 'redis', 'payment_gateway'
  operation?: string; // e.g., 'connect', 'query', 'webhook'
  retryable?: boolean;
  [key: string]: any;
}

/**
 * For system errors that developers must fix (500s)
 * These are NOT user-fixable errors
 */
export class SystemException extends HttpException {
  constructor(
    public readonly errorCode: CommonErrorCode,
    public readonly metadata?: SystemErrorMetadata,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(
      {
        errorCode,
        type: 'system_error', // Helps frontend distinguish
        ...(metadata && { metadata }),
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

/**
 * Static helpers for common system errors
 * Uses BaseErrorHelpers-like pattern for consistency
 */
export class SystemErrors {
  private static createSystemError(
    errorCode: CommonErrorCode,
    metadata: SystemErrorMetadata,
  ): SystemException {
    return new SystemException(errorCode, metadata);
  }

  static databaseConnectionFailed(component = 'database'): SystemException {
    return this.createSystemError(CommonErrorCode.DATABASE_CONNECTION_ERROR, {
      component,
      operation: 'connect',
      retryable: true,
    });
  }

  static serviceUnavailable(service: string): SystemException {
    return this.createSystemError(CommonErrorCode.SERVICE_UNAVAILABLE, {
      component: service,
      retryable: true,
    });
  }

  static systemNotReady(): SystemException {
    return this.createSystemError(CommonErrorCode.SYSTEM_NOT_READY, {
      component: 'system',
      retryable: false,
    });
  }

  // Legacy method - use specific methods above instead
  static internalServerError(details?: Record<string, any>): SystemException {
    return this.createSystemError(CommonErrorCode.INTERNAL_SERVER_ERROR, {
      ...details,
      retryable: false,
    });
  }

  static unknownTransitionLogic(
    transitionLogic: string,
    component = 'payment-state-machine',
  ): SystemException {
    return this.createSystemError(CommonErrorCode.UNKNOWN_TRANSITION_LOGIC, {
      component,
      operation: 'transition',
      transitionLogic,
      retryable: false,
    });
  }
}
