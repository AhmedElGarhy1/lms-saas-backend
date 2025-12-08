import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Class } from './class.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('class_staff')
@Index(['userProfileId', 'classId'], { unique: true })
@Index(['classId'])
@Index(['centerId'])
@Index(['userProfileId'])
export class ClassStaff extends BaseEntity {
  @Column({ type: 'uuid' })
  userProfileId: string;

  @Column({ type: 'uuid' })
  classId: string;

  @Column({ type: 'uuid' })
  centerId: string; // Denormalized from Class for performance

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

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
