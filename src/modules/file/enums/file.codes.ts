/**
 * File-specific error codes
 * Following the established pattern of module-specific error codes
 */
export enum FileErrorCode {
  FILE_NOT_FOUND = 'FILE_001',
  UPLOAD_FAILED = 'FILE_002',
  DELETE_FAILED = 'FILE_003',
  INVALID_FILE_TYPE = 'FILE_004',
  FILE_TOO_LARGE = 'FILE_005',
  UNAUTHORIZED_ACCESS = 'FILE_006',
  INVALID_ENTITY = 'FILE_007',
  FILE_REQUIRED = 'FILE_008',
}
