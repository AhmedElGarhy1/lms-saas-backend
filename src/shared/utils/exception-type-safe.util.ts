import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../common/enums/error-codes.enum';
import {
  EnhancedErrorResponse,
  ErrorDetail,
} from '../common/exceptions/custom.exceptions';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '../../../generated/i18n.generated';

/**
 * Type-safe utility functions to create translated exceptions
 * All parameters are type-checked at compile time
 */

export function createNotFoundError(
  i18n: I18nService<I18nTranslations>,
  resource: string,
  context?: Record<string, string | number>,
): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.NOT_FOUND,
      message: i18n.translate('errors.RESOURCE_NOT_FOUND', {
        args: context,
      }),
      error: 'Not Found',
      code: ErrorCode.RESOURCE_NOT_FOUND,
      timestamp: new Date().toISOString(),
      userMessage: i18n.translate('userMessages.resourceNotFound', {
        args: context,
      }),
      actionRequired: i18n.translate('actions.retry', {
        args: context,
      }),
      retryable: false,
    } as EnhancedErrorResponse,
    HttpStatus.NOT_FOUND,
  );
}

export function createValidationError(
  i18n: I18nService<I18nTranslations>,
  details: ErrorDetail[],
): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.BAD_REQUEST,
      message: i18n.translate('errors.VALIDATION_FAILED'),
      error: 'Bad Request',
      code: ErrorCode.VALIDATION_FAILED,
      timestamp: new Date().toISOString(),
      userMessage: i18n.translate('userMessages.validationFailed'),
      actionRequired: i18n.translate('actions.fixErrors'),
      retryable: true,
      details,
    } as EnhancedErrorResponse,
    HttpStatus.BAD_REQUEST,
  );
}

export function createUnauthorizedError(
  i18n: I18nService<I18nTranslations>,
): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.UNAUTHORIZED,
      message: i18n.translate('errors.AUTHENTICATION_FAILED'),
      error: 'Unauthorized',
      code: ErrorCode.AUTHENTICATION_FAILED,
      timestamp: new Date().toISOString(),
      userMessage: i18n.translate('userMessages.authenticationFailed'),
      actionRequired: i18n.translate('actions.verifyCredentials'),
      retryable: true,
    } as EnhancedErrorResponse,
    HttpStatus.UNAUTHORIZED,
  );
}

export function createForbiddenError(
  i18n: I18nService<I18nTranslations>,
): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.FORBIDDEN,
      message: i18n.translate('errors.ACCESS_DENIED'),
      error: 'Forbidden',
      code: ErrorCode.ACCESS_DENIED,
      timestamp: new Date().toISOString(),
      userMessage: i18n.translate('userMessages.accessDenied'),
      actionRequired: i18n.translate('actions.checkPermissions'),
      retryable: false,
    } as EnhancedErrorResponse,
    HttpStatus.FORBIDDEN,
  );
}

export function createUserExistsError(
  i18n: I18nService<I18nTranslations>,
  email: string,
  context?: Record<string, string | number>,
): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.CONFLICT,
      message: i18n.translate('errors.USER_ALREADY_EXISTS', {
        args: { ...context, email },
      }),
      error: 'Conflict',
      code: ErrorCode.USER_ALREADY_EXISTS,
      timestamp: new Date().toISOString(),
      userMessage: i18n.translate('userMessages.userAlreadyExists', {
        args: { ...context, email },
      }),
      actionRequired: i18n.translate('actions.chooseDifferentValue', {
        args: { ...context, field: 'email' },
      }),
      retryable: false,
    } as EnhancedErrorResponse,
    HttpStatus.CONFLICT,
  );
}

export function createCenterRequiredError(
  i18n: I18nService<I18nTranslations>,
): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.BAD_REQUEST,
      message: i18n.translate('errors.CENTER_SELECTION_REQUIRED'),
      error: 'Center Selection Required',
      code: ErrorCode.CENTER_SELECTION_REQUIRED,
      timestamp: new Date().toISOString(),
      userMessage: i18n.translate('userMessages.centerSelectionRequired'),
      actionRequired: i18n.translate('actions.selectCenter'),
      retryable: false,
    } as EnhancedErrorResponse,
    HttpStatus.BAD_REQUEST,
  );
}

export function createInternalServerError(
  i18n: I18nService<I18nTranslations>,
): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: i18n.translate('errors.INTERNAL_SERVER_ERROR'),
      error: 'Internal Server Error',
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      userMessage: i18n.translate('userMessages.internalServerError'),
      actionRequired: i18n.translate('actions.contactSupport'),
      retryable: true,
    } as EnhancedErrorResponse,
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
