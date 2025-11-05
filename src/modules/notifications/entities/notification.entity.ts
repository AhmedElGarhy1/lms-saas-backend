import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { User } from '@/modules/user/entities/user.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationActionType } from '../enums/notification-action-type.enum';

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

@Entity('notifications')
@Index(['userId', 'readAt'])
@Index(['userId', 'createdAt'])
@Index(['userId', 'profileType', 'profileId'])
@Index(['createdAt'])
export class Notification extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  actionUrl?: string;

  @Column({
    type: 'enum',
    enum: NotificationActionType,
    nullable: true,
    default: NotificationActionType.NAVIGATE,
  })
  actionType?: NotificationActionType;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ type: 'varchar', length: 100 })
  type: NotificationType;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon?: string;

  @Column({ type: 'enum', enum: ProfileType, nullable: true })
  profileType?: ProfileType | null;

  @Column({ type: 'uuid', nullable: true })
  profileId?: string | null;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    default: NotificationChannel.IN_APP,
  })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
