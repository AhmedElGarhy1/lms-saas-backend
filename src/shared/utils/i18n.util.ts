import { I18nContext } from 'nestjs-i18n';

/**
 * Get translation by key with optional variable substitution
 * Can be used anywhere without dependency injection
 */
export function t(
  key: string,
  options?: { args?: Record<string, any>; lang?: string },
): string {
  const i18n = I18nContext.current();
  return i18n?.translate(key, options) || key;
}

/**
 * Get API success message
 */
export function tApiSuccess(action: string, resource?: string): string {
  const key = `api.success.${action}${resource ? `.${resource}` : ''}`;
  const result = t(key);
  return result !== key
    ? result
    : `${action}${resource ? ` ${resource}` : ''} completed successfully`;
}

/**
 * Get API error message
 */
export function tApiError(action: string, resource?: string): string {
  const key = `api.error.${action}${resource ? `.${resource}` : ''}`;
  const result = t(key);
  return result !== key
    ? result
    : `Failed to ${action}${resource ? ` ${resource}` : ''}`;
}

/**
 * Get validation error message
 */
export function tValidation(field: string, errorType: string): string {
  const key = `validation.${errorType}`;
  const result = t(key);
  return result !== key
    ? result
    : `${field.charAt(0).toUpperCase() + field.slice(1)} ${errorType}`;
}

/**
 * Get error message by error code
 */
export function tError(
  errorCode: string,
  context?: Record<string, string | number>,
): string {
  const key = `errors.${errorCode}`;
  const result = t(key, { args: context });
  return result !== key ? result : `Error: ${errorCode}`;
}

/**
 * Get success message by action
 */
export function tSuccess(
  action: string,
  resource?: string,
  context?: Record<string, string | number>,
): string {
  const key = `success.${action}${resource ? `.${resource}` : ''}`;
  const result = t(key, { args: context });
  return result !== key
    ? result
    : `${action}${resource ? ` ${resource}` : ''} completed successfully`;
}

/**
 * Get user message by key
 */
export function tUserMessage(
  key: string,
  context?: Record<string, string | number>,
): string {
  return t(`userMessages.${key}`, { args: context });
}

/**
 * Get action message by key
 */
export function tAction(
  key: string,
  context?: Record<string, string | number>,
): string {
  return t(`actions.${key}`, { args: context });
}

/**
 * Get system message by key
 */
export function tSystem(
  key: string,
  context?: Record<string, string | number>,
): string {
  return t(`system.${key}`, { args: context });
}

/**
 * Get common message by key
 */
export function tCommon(
  key: string,
  context?: Record<string, string | number>,
): string {
  return t(`common.${key}`, { args: context });
}
