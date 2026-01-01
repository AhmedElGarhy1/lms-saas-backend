/**
 * Database error codes constants
 * Centralizes database error code definitions to avoid magic strings
 */
export const DATABASE_ERROR_CODES = {
  UNIQUE_VIOLATION: ['23505', 'ER_DUP_ENTRY', 1062] as const,
  FOREIGN_KEY_VIOLATION: ['23503', 'ER_NO_REFERENCED_ROW_2', 1452] as const,
  EXCLUSION_VIOLATION: ['23P01'] as const, // PostgreSQL exclusion constraint violation
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
 * Common error messages
 * Centralizes error message definitions for consistency
 */
export const ERROR_MESSAGES = {
  ERRORS: {
    DUPLICATE_FIELD: 'Duplicate field value',
    RESOURCE_NOT_FOUND: 'Resource not found',
    RELATED_ENTITY_MISSING_OR_INVALID: 'Related entity is missing or invalid',
    TEMPORARY_DATABASE_CONFLICT: 'Temporary database conflict',
    DATABASE_OPERATION_FAILED: 'Database operation failed',
    SCHEDULE_CONFLICT: 'Schedule conflict detected', // For exclusion constraint violations (overlapping sessions)
    GENERIC_ERROR: 'An error occurred',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    SERVICE_UNAVAILABLE: 'Service unavailable',
    BUSINESS_LOGIC_ERROR: 'Business logic error',
    REQUIRED_FIELD: 'Field is required',
  },
} as const;
