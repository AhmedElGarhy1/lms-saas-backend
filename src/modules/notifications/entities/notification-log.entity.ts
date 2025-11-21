import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';

@Entity('notification_logs')
@Index(['userId'])
@Index(['centerId'])
@Index(['status'])
@Index(['type'])
@Index(['channel'])
@Index(['createdAt'])
@Index(['status', 'createdAt']) // Composite index for DLQ cleanup (status + createdAt for efficient date-based queries)
@Index(['userId', 'centerId', 'status'])
@Index(['userId', 'profileType', 'profileId'])
@Index(['profileType', 'profileId'])
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 20 })
  channel: NotificationChannel;

  @Column({
    type: 'varchar',
    length: 20,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'varchar', length: 255 })
  recipient: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'uuid', nullable: true })
  centerId?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  profileType?: ProfileType | null;

  @Column({ type: 'uuid', nullable: true })
  profileId?: string | null;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index(['jobId'])
  jobId?: string;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Center, { nullable: true })
  @JoinColumn({ name: 'centerId' })
  center?: Center;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
