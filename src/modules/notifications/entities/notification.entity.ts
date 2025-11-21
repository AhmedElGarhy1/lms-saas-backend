import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationStatus } from '../enums/notification-status.enum';

@Entity('notifications')
@Index(['userId', 'readAt'])
@Index(['userId', 'createdAt'])
@Index(['userId', 'profileType', 'profileId'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

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

  @Column({ type: 'varchar', length: 20, nullable: true })
  profileType?: ProfileType | null;

  @Column({ type: 'uuid', nullable: true })
  profileId?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: NotificationChannel.IN_APP,
  })
  channel: NotificationChannel;

  @Column({
    type: 'varchar',
    length: 20,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
