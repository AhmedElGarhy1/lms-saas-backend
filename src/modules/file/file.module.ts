import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { FileService } from './services/file.service';
import { R2Module } from '../r2/r2.module';

/**
 * File Management Module
 *
 * Provides centralized file management for the LMS with:
 * - File upload and storage via R2
 * - Rich metadata tracking
 * - Access control and permissions
 * - File lifecycle management
 * - Storage analytics
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    R2Module, // For R2 storage operations
  ],
  providers: [FileService],
  exports: [FileService, TypeOrmModule],
})
export class FileModule {}
