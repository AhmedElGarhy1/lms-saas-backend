import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { SoftBaseEntity } from '@/shared/common/entities/soft-base.entity';

@Entity('center_access')
@Index(['userProfileId', 'centerId'], { unique: true })
@Index(['centerId'])
export class CenterAccess extends SoftBaseEntity {
  @Column({ type: 'uuid' })
  userProfileId: string;

  @Column({ type: 'uuid' })
  centerId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => UserProfile, (userProfile) => userProfile.centerAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userProfileId' })
  profile: UserProfile;

  @ManyToOne(() => Center, (center) => center.centerAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;
}
