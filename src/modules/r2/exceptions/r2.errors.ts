import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { R2ErrorCode } from '../enums/r2.codes';

/**
 * R2-specific error helpers
 * Clean, simple, and maintainable error creation following established patterns
 */
export class R2Errors extends BaseErrorHelpers {
  static fileNotFound(filename?: string): DomainException {
    return this.createWithDetails(R2ErrorCode.FILE_NOT_FOUND, { filename });
  }

  static uploadFailed(reason?: string): DomainException {
    return this.createWithDetails(R2ErrorCode.UPLOAD_FAILED, { reason });
  }

  static invalidFileType(mimeType?: string): DomainException {
    return this.createWithDetails(R2ErrorCode.INVALID_FILE_TYPE, { mimeType });
  }

  static fileTooLarge(maxSize: number, actualSize: number): DomainException {
    return this.createWithDetails(R2ErrorCode.FILE_TOO_LARGE, {
      maxSize,
      actualSize,
    });
  }

  static presignedUrlExpired(): DomainException {
    return this.createNoDetails(R2ErrorCode.PRESIGNED_URL_EXPIRED);
  }

  static deleteFailed(reason?: string): DomainException {
    return this.createWithDetails(R2ErrorCode.DELETE_FAILED, { reason });
  }

  static bucketNotFound(bucket?: string): DomainException {
    return this.createWithDetails(R2ErrorCode.BUCKET_NOT_FOUND, { bucket });
  }

  static invalidKey(key?: string): DomainException {
    return this.createWithDetails(R2ErrorCode.INVALID_KEY, { key });
  }
}