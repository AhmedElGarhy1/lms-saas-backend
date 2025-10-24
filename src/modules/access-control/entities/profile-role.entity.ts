import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Role } from './role.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { UserProfile } from '@/modules/profile/entities/user-profile.entity';

@Entity('profile_roles')
@Index(['userProfileId', 'centerId', 'roleId'], { unique: true })
@Index(['centerId'])
export class ProfileRole extends BaseEntity {
  @Column({ type: 'uuid' })
  roleId: string;

  @Column({ type: 'uuid', nullable: true })
  centerId?: string;

  @Column({ type: 'uuid' })
  userProfileId: string;

  @ManyToOne(() => Role, (role) => role.profileRoles)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne(() => Center, (center) => center.profileRoles)
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @ManyToOne(() => UserProfile, (userProfile) => userProfile.profileRoles)
  @JoinColumn({ name: 'userProfileId' })
  userProfile: UserProfile;
}
