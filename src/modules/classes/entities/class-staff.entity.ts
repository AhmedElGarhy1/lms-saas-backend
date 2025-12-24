import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Class } from './class.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('class_staff')
// Note: Unique constraint is now handled via partial unique index in the database
// (UQ_class_staff_active_userProfileId_classId) which only applies when leftAt IS NULL
@Index(['classId'])
@Index(['centerId'])
@Index(['userProfileId'])
@Index(['centerId', 'branchId'])
export class ClassStaff extends BaseEntity {
  @Column({ type: 'uuid' })
  userProfileId: string;

  @Column({ type: 'uuid' })
  classId: string;

  @Column({ type: 'uuid' })
  centerId: string; // Denormalized from Class for performance

  @Column({ type: 'uuid' })
  branchId: string; // Denormalized from Class for performance and snapshot

  
  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  joinedAt: Date;

  
  @Column({ type: 'timestamptz', nullable: true })
  leftAt?: Date;

  // Relations
  @ManyToOne(() => UserProfile, (userProfile) => userProfile.classStaff, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userProfileId' })
  profile: UserProfile;

  @ManyToOne(() => Class, (classEntity) => classEntity.classStaff, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classId' })
  class: Class;
}
