import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('user_access')
@Index(['granterUserProfileId', 'targetUserProfileId', 'centerId'], {
  unique: true,
})
export class UserAccess extends BaseEntity {
  @Column({ type: 'uuid' })
  targetUserProfileId: string;

  @Column({ type: 'uuid' })
  granterUserProfileId: string;

  @Column({ type: 'uuid', nullable: true })
  centerId: string;

  @ManyToOne(() => UserProfile, (userProfile) => userProfile.accessTarget, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'targetUserProfileId' })
  target: UserProfile;

  @ManyToOne(() => UserProfile, (userProfile) => userProfile.accessGranter, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'granterUserProfileId' })
  granter: UserProfile;

  @ManyToOne(() => Center, (center) => center.userAccess, {
    nullable: true,
  })
  @JoinColumn({ name: 'centerId' })
  center?: Center;
}
