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
    DUPLICATE_FIELD: 't.errors.duplicateField',
    RESOURCE_NOT_FOUND: 't.errors.resourceNotFound',
    RELATED_ENTITY_MISSING_OR_INVALID:
      't.errors.relatedEntityMissingOrInvalid',
    TEMPORARY_DATABASE_CONFLICT:
      't.errors.temporaryDatabaseConflict',
    DATABASE_OPERATION_FAILED: 't.errors.databaseOperationFailed',
    GENERIC_ERROR: 't.errors.genericError',
    INTERNAL_SERVER_ERROR: 't.errors.internalServerError',
    SERVICE_UNAVAILABLE: 't.errors.serviceUnavailable',
    BUSINESS_LOGIC_ERROR: 't.errors.businessLogicError',
    REQUIRED_FIELD: 't.errors.required.field',
  },
} as const;
