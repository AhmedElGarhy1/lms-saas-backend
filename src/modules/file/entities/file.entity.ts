import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Class } from '@/modules/classes/entities/class.entity';

/**
 * File entity for managing all uploaded files in the LMS
 * Provides centralized file management with rich metadata
 */
@Entity('files')
@Index(['entityType', 'entityId']) // Fast queries by owner
@Index(['fileType']) // Filter by file type
@Index(['isActive']) // Active files only
export class File extends BaseEntity {
  // === FILE METADATA ===
  @Column({ type: 'varchar', length: 500 })
  key: string; // R2 key (e.g., "1736547890123-abc123-document.pdf")

  @Column({ type: 'varchar', length: 255 })
  originalName: string; // "lesson-1-homework.pdf"

  @Column({ type: 'varchar', length: 100 })
  mimeType: string; // "application/pdf"

  @Column({ type: 'bigint' })
  size: number; // File size in bytes

  // === RELATIONSHIPS ===
  @Column({ type: 'varchar', length: 50 })
  entityType: string; // 'user', 'user_profile', 'class', 'assignment', 'center'

  @Column({ type: 'uuid' })
  entityId: string; // ID of the owning entity

  @Column({ type: 'varchar', length: 50 })
  fileType: string; // 'avatar', 'material', 'submission', 'certificate', 'id_document'

  // === OPTIONAL METADATA ===
  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Soft delete alternative

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>; // Extra data (dimensions, duration, etc.)
}
