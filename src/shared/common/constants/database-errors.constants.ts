import { I18nPath } from '@/generated/i18n.generated';

/**
 * Database error codes constants
 * Centralizes database error code definitions to avoid magic strings
 */
export const DATABASE_ERROR_CODES = {
  UNIQUE_VIOLATION: ['23505', 'ER_DUP_ENTRY', 1062] as const,
  FOREIGN_KEY_VIOLATION: ['23503', 'ER_NO_REFERENCED_ROW_2', 1452] as const,
  DEADLOCK: ['40001', '40P01'] as const,
};

/**
 * Helper function to check if a code matches any in the array
 */
export function isDatabaseErrorCode(
  code: string | number | undefined,
  codes: readonly (string | number)[],
): boolean {
  if (code === undefined) return false;
  return codes.includes(code);
}

/**
 * Common translation keys
 * Centralizes translation key definitions to avoid typos
 */
export const TRANSLATION_KEYS = {
  ERRORS: {
    DUPLICATE_FIELD: 't.errors.duplicateField' as I18nPath,
    RESOURCE_NOT_FOUND: 't.errors.resourceNotFound' as I18nPath,
    RELATED_ENTITY_MISSING_OR_INVALID:
      't.errors.relatedEntityMissingOrInvalid' as I18nPath,
    TEMPORARY_DATABASE_CONFLICT:
      't.errors.temporaryDatabaseConflict' as I18nPath,
    DATABASE_OPERATION_FAILED: 't.errors.databaseOperationFailed' as I18nPath,
    GENERIC_ERROR: 't.errors.genericError' as I18nPath,
    INTERNAL_SERVER_ERROR: 't.errors.internalServerError' as I18nPath,
    SERVICE_UNAVAILABLE: 't.errors.serviceUnavailable' as I18nPath,
    BUSINESS_LOGIC_ERROR: 't.errors.businessLogicError' as I18nPath,
    REQUIRED_FIELD: 't.errors.required.field' as I18nPath,
  },
};
