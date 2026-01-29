import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { SoftBaseEntity } from '@/shared/common/entities/soft-base.entity';
import { User } from './user.entity';

/**
 * UserDevice Entity
 *
 * Tracks devices that have logged into a user's account.
 * Used for "new device login" detection without over-engineering.
 *
 * Fingerprint is generated server-side from User-Agent + Accept-Language headers.
 */
@Entity('user_devices')
@Index(['userId', 'fingerprint'], { unique: true })
@Index(['userId'])
export class UserDevice extends SoftBaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 64 })
  fingerprint: string; // MD5 hash of User-Agent + Accept-Language

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName: string; // "Chrome on Windows"

  @Column({ type: 'varchar', length: 256, nullable: true })
  fcmToken: string | null; // FCM device token for push notifications

  @Column({ type: 'timestamptz' })
  lastUsedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
