import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { Config } from '@/shared/config/config';
import { BaseService } from '@/shared/common/services/base.service';
import { R2Errors } from '../exceptions/r2.errors';
import {
  UploadOptions,
  FileInfo,
  PresignedUrlOptions,
} from '../interfaces/r2-config.interface';

/**
 * Cloudflare R2 Service
 * Provides S3-compatible file operations using Cloudflare R2 storage
 */
@Injectable()
export class R2Service extends BaseService {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(R2Service.name);
  private readonly bucket: string;
  private readonly presignedUrlExpires: number;

  // File size limits (in bytes)
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly ALLOWED_MIME_TYPES = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',

    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',

    // Videos (basic support)
    'video/mp4',
    'video/webm',
  ];

  constructor() {
    super();
    this.bucket = Config.r2.bucket;
    this.presignedUrlExpires = Config.r2.presignedUrlExpires;

    // Only initialize S3 client if R2 is configured
    if (
      Config.r2.accountId &&
      Config.r2.accessKeyId &&
      Config.r2.secretAccessKey &&
      Config.r2.bucket
    ) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${Config.r2.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: Config.r2.accessKeyId,
          secretAccessKey: Config.r2.secretAccessKey,
        },
      });
      this.logger.log(`R2Service initialized for bucket: ${this.bucket}`);
    } else {
      this.logger.warn(
        'R2 configuration is incomplete - R2 features will not be available',
      );
    }
  }

  /**
   * Upload a file to R2
   */
  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<{ key: string; size: number; contentType: string }> {
    if (!this.s3Client) {
      throw R2Errors.uploadFailed('R2 is not configured');
    }

    try {
      // Validate file
      this.validateFile(file);

      // Use custom key if provided, otherwise generate unique key
      const key = options.key || this.generateFileKey(file.originalname);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: options.metadata,
      });

      await this.s3Client.send(command);

      this.logger.log(
        `File uploaded successfully: ${key} (${file.size} bytes)`,
      );

      return {
        key,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${file.originalname}`, error);
      throw R2Errors.uploadFailed(error.message);
    }
  }

  /**
   * Generate a presigned URL for file access
   */
  async generatePresignedUrl(
    key: string,
    options: PresignedUrlOptions = {},
  ): Promise<string> {
    if (!this.s3Client) {
      throw R2Errors.presignedUrlExpired(); // Closest error - service not available
    }

    try {
      if (!key || typeof key !== 'string') {
        throw R2Errors.invalidKey(key);
      }

      const expiresIn = options.expiresIn || this.presignedUrlExpires;

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: options.contentType,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.debug(
        `Presigned URL generated for: ${key} (expires in ${expiresIn}s)`,
      );

      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for: ${key}`, error);
      if (error instanceof R2Errors) {
        throw error;
      }
      throw R2Errors.uploadFailed('Failed to generate presigned URL');
    }
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.s3Client) {
      throw R2Errors.deleteFailed('R2 is not configured');
    }

    try {
      if (!key || typeof key !== 'string') {
        throw R2Errors.invalidKey(key);
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${key}`, error);
      throw R2Errors.deleteFailed(error.message);
    }
  }

  /**
   * Generate public URL for a file (for public content like avatars)
   */
  getPublicUrl(key: string): string {
    if (!Config.r2.accountId || !this.bucket) {
      throw R2Errors.uploadFailed('R2 is not configured');
    }

    // Use custom domain if configured, otherwise fallback to Cloudflare R2 default
    if (Config.r2.publicUrlDomain) {
      return `${Config.r2.publicUrlDomain}/${key}`;
    }

    return `https://${Config.r2.accountId}.r2.cloudflarestorage.com/${this.bucket}/${key}`;
  }

  /**
   * Get file information
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    if (!this.s3Client) {
      throw R2Errors.fileNotFound(key);
    }

    try {
      if (!key || typeof key !== 'string') {
        throw R2Errors.invalidKey(key);
      }

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || '',
      };
    } catch (error) {
      this.logger.error(`Failed to get file info: ${key}`, error);
      throw R2Errors.fileNotFound(key);
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw R2Errors.uploadFailed('No file provided');
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw R2Errors.fileTooLarge(this.MAX_FILE_SIZE, file.size);
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw R2Errors.invalidFileType(file.mimetype);
    }
  }

  /**
   * Generate a unique file key
   */
  private generateFileKey(originalName: string): string {
    const timestamp = Date.now();
    const randomId = randomUUID().substring(0, 8);
    const extension = this.getFileExtension(originalName);

    return `${timestamp}-${randomId}${extension}`;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }
}
