import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { FileErrorCode } from '../enums/file.codes';

/**
 * Custom exception factory for ParseFilePipe to use our error codes
 */
export function createFileValidationException(error: any): DomainException {
  const message = error.message || error.toString();

  // Handle "File is required" error from ParseFilePipe
  if (
    message.includes('File is required') ||
    message.includes('file is required')
  ) {
    return FileErrors.fileRequired('avatar');
  }

  // Handle custom validator errors from our validators
  if (message.includes('too large') || message.includes('Maximum size')) {
    // Extract size information if possible
    const maxSizeMatch = message.match(/Maximum size: (\d+(?:\.\d+)?)/);
    const maxSize = maxSizeMatch
      ? parseFloat(maxSizeMatch[1]) * 1024 * 1024
      : 5 * 1024 * 1024;
    return FileErrors.fileTooLarge(maxSize, 0);
  }

  if (
    message.includes('Invalid file type') ||
    message.includes('Allowed types')
  ) {
    return FileErrors.invalidFileType();
  }

  if (
    message.includes('dimensions must be between') ||
    message.includes('width') ||
    message.includes('height') ||
    message.includes('Image dimensions')
  ) {
    return FileErrors.uploadFailed('Invalid image dimensions');
  }

  if (
    message.includes('Invalid image') ||
    message.includes('Invalid or corrupted image') ||
    message.includes('corrupted') ||
    message.includes('magic bytes')
  ) {
    return FileErrors.uploadFailed('Invalid or corrupted image file');
  }

  if (
    message.includes('missing file data') ||
    message.includes('File buffer is missing')
  ) {
    return FileErrors.uploadFailed('File data is missing or corrupted');
  }

  // Default fallback for any other validation errors
  return FileErrors.uploadFailed(message);
}

/**
 * File-specific error helpers
 * Clean, simple, and maintainable error creation following established patterns
 */
export class FileErrors extends BaseErrorHelpers {
  static fileNotFound(fileId?: string): DomainException {
    return this.createWithDetails(FileErrorCode.FILE_NOT_FOUND, { fileId });
  }

  static uploadFailed(reason?: string): DomainException {
    return this.createWithDetails(FileErrorCode.UPLOAD_FAILED, { reason });
  }

  static deleteFailed(reason?: string): DomainException {
    return this.createWithDetails(FileErrorCode.DELETE_FAILED, { reason });
  }

  static invalidFileType(mimeType?: string): DomainException {
    return this.createWithDetails(FileErrorCode.INVALID_FILE_TYPE, {
      mimeType,
    });
  }

  static fileTooLarge(maxSize: number, actualSize: number): DomainException {
    return this.createWithDetails(FileErrorCode.FILE_TOO_LARGE, {
      maxSize,
      actualSize,
    });
  }

  static unauthorizedAccess(fileId?: string): DomainException {
    return this.createWithDetails(FileErrorCode.UNAUTHORIZED_ACCESS, {
      fileId,
    });
  }

  static invalidEntity(
    entityType?: string,
    entityId?: string,
  ): DomainException {
    return this.createWithDetails(FileErrorCode.INVALID_ENTITY, {
      entityType,
      entityId,
    });
  }

  static fileRequired(fieldName?: string): DomainException {
    return this.createWithDetails(FileErrorCode.FILE_REQUIRED, { fieldName });
  }
}
