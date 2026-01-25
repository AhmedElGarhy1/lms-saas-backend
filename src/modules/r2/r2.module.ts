import { Module } from '@nestjs/common';
import { R2Service } from './services/r2.service';

/**
 * Cloudflare R2 Storage Service Module
 *
 * Internal utility module providing S3-compatible operations.
 * Used by FileService for actual file storage operations.
 *
 * This module provides low-level R2 operations:
 * - File upload to R2 storage
 * - Presigned URL generation
 * - File deletion from R2
 * - File information retrieval
 *
 * Note: This is an internal utility - use FileService for business logic
 */
@Module({
  providers: [R2Service],
  exports: [R2Service],
})
export class R2Module {}
