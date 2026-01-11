import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { File } from '../entities/file.entity';
import { R2Service } from '@/modules/r2/services/r2.service';
import { BaseService } from '@/shared/common/services/base.service';
import { FileErrors } from '../exceptions/file.errors';
import { randomUUID } from 'crypto';

/**
 * File service for managing uploaded files
 * Integrates with R2 for storage and provides rich file management
 */
@Injectable()
export class FileService extends BaseService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly r2Service: R2Service,
  ) {
    super();
  }

  /**
   * Upload a file and create a File record
   */
  async uploadFile(
    file: Express.Multer.File,
    metadata: {
      entityType: string;
      entityId: string;
      fileType: string;
      description?: string;
    },
  ): Promise<File> {
    try {
      console.log('file', file);
      // Optimize images before uploading
      let fileBuffer = file.buffer;
      let fileMimeType = file.mimetype;

      if (this.isOptimizableImage(file)) {
        const optimized = await this.optimizeImage(fileBuffer, fileMimeType);
        fileBuffer = optimized.buffer;
        fileMimeType = optimized.mimeType;
        this.logger.log(
          `Image optimized: ${file.originalname} (${file.size} → ${fileBuffer.length} bytes)`,
        );
      }

      // Generate organized file key with folder structure
      const key = this.generateFileKey(metadata, file);

      // Update the original file object with optimized data
      file.buffer = fileBuffer;
      file.mimetype = fileMimeType;
      file.size = fileBuffer.length;

      // Upload to R2 with properly modified file object and custom key
      const uploadResult = await this.r2Service.uploadFile(file, { key });

      // Create File record
      const fileRecord = this.fileRepository.create({
        key: uploadResult.key,
        originalName: file.originalname,
        mimeType: fileMimeType,
        size: fileBuffer.length,
        entityType: metadata.entityType,
        entityId: metadata.entityId,
        fileType: metadata.fileType,
        description: metadata.description,
      });

      const savedFile = await this.fileRepository.save(fileRecord);

      this.logger.log(
        `File uploaded and recorded: ${savedFile.id} (${savedFile.key}) for ${metadata.entityType}:${metadata.entityId}`,
      );

      return savedFile;
    } catch (error) {
      this.logger.error(
        `Failed to upload file for ${metadata.entityType}:${metadata.entityId}`,
        error,
      );
      throw FileErrors.uploadFailed(error.message);
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId: string): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, isActive: true },
    });

    if (!file) {
      throw FileErrors.fileNotFound(fileId);
    }

    return file;
  }

  /**
   * Get presigned URL for file access
   */
  async getPresignedUrl(
    fileId: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const file = await this.getFileById(fileId);
    return this.r2Service.generatePresignedUrl(file.key, { expiresIn });
  }

  /**
   * Get files by entity
   */
  async getFilesByEntity(
    entityType: string,
    entityId: string,
    fileType?: string,
  ): Promise<File[]> {
    const where: any = {
      entityType,
      entityId,
      isActive: true,
    };

    if (fileType) {
      where.fileType = fileType;
    }

    return this.fileRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Soft delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    const file = await this.getFileById(fileId);

    try {
      // Delete from R2 (optional - can keep files for backup)
      await this.r2Service.deleteFile(file.key);

      // Soft delete the record
      await this.fileRepository.update(fileId, { isActive: false });

      this.logger.log(`File soft deleted: ${fileId} (${file.key})`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${fileId}`, error);
      throw FileErrors.deleteFailed(error.message);
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    fileId: string,
    updates: Partial<Pick<File, 'description' | 'metadata'>>,
  ): Promise<File> {
    await this.fileRepository.update(fileId, updates);
    return this.getFileById(fileId);
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
  }> {
    const [totalFiles, totalSizeResult, filesByTypeResult] = await Promise.all([
      this.fileRepository.count({ where: { isActive: true } }),
      this.fileRepository
        .createQueryBuilder('file')
        .select('SUM(file.size)', 'totalSize')
        .where('file.isActive = true')
        .getRawOne(),
      this.fileRepository
        .createQueryBuilder('file')
        .select('file.fileType', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('file.isActive = true')
        .groupBy('file.fileType')
        .getRawMany(),
    ]);

    const filesByType = filesByTypeResult.reduce(
      (acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalFiles,
      totalSize: parseInt(totalSizeResult?.totalSize || '0'),
      filesByType,
    };
  }

  /**
   * Get public URL for a file (for public content like avatars)
   */
  getPublicUrl(key: string): string {
    return this.r2Service.getPublicUrl(key);
  }

  /**
   * Generate an organized file key with folder structure
   * Format: {entityType}/{fileType}/{timestamp}-{randomId}{extension}
   */
  private generateFileKey(
    metadata: {
      entityType: string;
      entityId: string;
      fileType: string;
      description?: string;
    },
    file: Express.Multer.File,
  ): string {
    const { entityType, fileType } = metadata;
    const timestamp = Date.now();
    const randomId = randomUUID().substring(0, 8);
    const extension = this.getFileExtension(file.originalname);

    // Create organized folder structure: entityType/fileType/
    // Examples:
    // - user/avatar/1768098409337-f84c33a8.png
    // - class/material/1768098409337-f84c33a8.pdf
    // - assignment/submission/1768098409337-f84c33a8.jpg
    const folder = `${entityType}/${fileType}`;

    return `${folder}/${timestamp}-${randomId}${extension}`;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return filename.substring(lastDotIndex);
  }

  /**
   * Get the appropriate URL for a file (public direct URL or signed URL)
   */
  async getFileUrl(file: File, isPublic: boolean = false): Promise<string> {
    if (isPublic) {
      // Public access: Direct R2 URL
      return this.getPublicUrl(file.key);
    } else {
      // Private access: Pre-signed URL
      return await this.getPresignedUrl(file.key);
    }
  }

  /**
   * Efficiently attach URLs to multiple entities with a single query
   * @param entities - Array of entities to attach URLs to
   * @param fileIdField - Field name containing the file ID (e.g., 'avatarFileId')
   * @param urlField - Field name to store the URL (e.g., 'avatarUrl')
   * @param isPublic - Whether to generate public URLs or signed URLs
   */
  async attachUrls<T extends Record<string, any>>(
    entities: T[],
    fileIdField: string,
    urlField: string = 'avatarUrl',
    isPublic: boolean = true,
  ): Promise<void> {
    // Collect all non-null file IDs
    const fileIds = entities
      .map((entity) => entity[fileIdField as keyof T])
      .filter((id) => id != null && typeof id === 'string') as string[];

    if (fileIds.length === 0) {
      return; // No files to attach
    }

    // Single query to get all files
    const files = await this.fileRepository.find({
      where: { id: In(fileIds) },
      select: ['id', 'key'], // Only need ID and key
    });

    // Create lookup map for O(1) access
    const fileMap = new Map(files.map((file) => [file.id, file]));

    // Attach URLs to entities
    for (const entity of entities) {
      const fileId = entity[fileIdField as keyof T] as string;
      const file = fileMap.get(fileId);

      if (file) {
        (entity as any)[urlField] = await this.getFileUrl(file, isPublic);
      }
    }
  }

  /**
   * Optimize image files for better performance
   */
  private async optimizeImage(
    buffer: Buffer,
    originalMimeType: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const sharp = require('sharp');

    try {
      let pipeline = sharp(buffer);

      // Resize images larger than 1200px to max 1200px (maintains aspect ratio)
      const metadata = await pipeline.metadata();
      if (metadata.width && metadata.width > 1200) {
        pipeline = pipeline.resize(1200, null, {
          fit: 'inside',
          withoutEnlargement: false,
        });
      }

      // Convert to WebP for better compression (except for small images)
      if (metadata.width && metadata.width > 100) {
        pipeline = pipeline.webp({
          quality: 85, // Good balance of size vs quality
          effort: 4, // Compression effort (higher = better compression)
        });

        return {
          buffer: await pipeline.toBuffer(),
          mimeType: 'image/webp',
        };
      }

      // For small images, just resize without format change
      return {
        buffer: await pipeline.toBuffer(),
        mimeType: originalMimeType,
      };
    } catch (error) {
      this.logger.warn(`Failed to optimize image: ${error.message}`);
      // Return original buffer if optimization fails
      return {
        buffer,
        mimeType: originalMimeType,
      };
    }
  }

  /**
   * Check if file is an image that should be optimized
   */
  private isOptimizableImage(file: Express.Multer.File): boolean {
    const optimizableTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
    ];

    return optimizableTypes.includes(file.mimetype.toLowerCase());
  }
}
