import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Group } from './group.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

@Entity('group_students')
@Index(['groupId'])
@Index(['studentUserProfileId'])
@Index(['classId'])
@Index(['classId', 'studentUserProfileId'], { unique: true })
@Unique(['groupId', 'studentUserProfileId'])
export class GroupStudent extends BaseEntity {
  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  studentUserProfileId: string;

  @Column({ type: 'uuid' })
  classId: string; // Denormalized from group for unique constraint

  // Relations
  @ManyToOne(() => Group, (group) => group.groupStudents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => UserProfile, (userProfile) => userProfile.groupStudents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studentUserProfileId' })
  student: UserProfile;
}
