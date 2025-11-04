import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { User } from '@/modules/user/entities/user.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationGroup } from '../enums/notification-group.enum';

@Entity('notification_preferences')
@Unique(['userId', 'channel', 'group', 'profileType', 'profileId'])
@Index(['userId'])
@Index(['userId', 'channel'])
@Index(['userId', 'group'])
@Index(['userId', 'profileType', 'profileId'])
@Index(['profileType', 'profileId'])
export class NotificationPreference extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'enum', enum: NotificationGroup })
  group: NotificationGroup;

  @Column({ type: 'enum', enum: ProfileType, nullable: true })
  profileType?: ProfileType | null;

  @Column({ type: 'uuid', nullable: true })
  profileId?: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
