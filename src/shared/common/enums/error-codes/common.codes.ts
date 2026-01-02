export enum CommonErrorCode {
  // System failures that developers must fix (500s only)
  INTERNAL_SERVER_ERROR = 'SYS_001',
  SERVICE_UNAVAILABLE = 'SYS_002',
  SYSTEM_NOT_READY = 'SYS_003',
  DATABASE_CONNECTION_ERROR = 'SYS_004',
  UNKNOWN_TRANSITION_LOGIC = 'SYS_005',

  // Generic domain errors - use across multiple modules
  INSUFFICIENT_PERMISSIONS = 'GEN_003', // Generic permission error
  ACCESS_DENIED = 'GEN_004', // Generic access control error
  TOO_MANY_ATTEMPTS = 'GEN_006', // Rate limiting for any operation

  // Common domain errors - use for cross-cutting concerns
  RESOURCE_NOT_FOUND = 'GEN_001', // Generic resource not found
  VALIDATION_FAILED = 'GEN_002', // Generic validation failure
}
