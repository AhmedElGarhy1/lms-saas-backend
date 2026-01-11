/**
 * R2 configuration interface
 */
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  presignedUrlExpires: number;
  publicUrlDomain: string;
}

/**
 * Upload options for files
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  key?: string; // Custom key for organized file storage
}

/**
 * File information response
 */
export interface FileInfo {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
}

/**
 * Presigned URL options
 */
export interface PresignedUrlOptions {
  expiresIn?: number;
  contentType?: string;
}
