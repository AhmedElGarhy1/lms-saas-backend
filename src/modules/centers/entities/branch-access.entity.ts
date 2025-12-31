import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Branch } from './branch.entity';
import { Center } from './center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('branch_access')
@Index(['userProfileId', 'branchId'], { unique: true })
@Index(['userProfileId'])
@Index(['branchId'])
@Index(['centerId'])
export class BranchAccess extends BaseEntity {
  @Column({ type: 'uuid' })
  userProfileId: string;

  @Column({ type: 'uuid' })
  branchId: string;

  @Column({ type: 'uuid', nullable: true })
  centerId: string;

  // Relations
  @ManyToOne(() => UserProfile, (userProfile) => userProfile.branchAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userProfileId' })
  profile: UserProfile;

  @ManyToOne(() => Branch, (branch) => branch.branchAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => Center, (center) => center.branchAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;
}
