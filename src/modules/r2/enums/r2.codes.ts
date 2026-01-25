/**
 * R2-specific error codes
 * Following the established pattern of module-specific error codes
 */
export enum R2ErrorCode {
  // FILE_NOT_FOUND removed - use FileErrors.fileNotFound() instead
  UPLOAD_FAILED = 'R2_002',
  INVALID_FILE_TYPE = 'R2_003',
  FILE_TOO_LARGE = 'R2_004',
  PRESIGNED_URL_EXPIRED = 'R2_005',
  DELETE_FAILED = 'R2_006',
  BUCKET_NOT_FOUND = 'R2_007',
  INVALID_KEY = 'R2_008',
}
