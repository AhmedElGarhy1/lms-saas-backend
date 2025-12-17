import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Group } from './group.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

@Entity('group_students')
@Index(['groupId'])
@Index(['studentUserProfileId'])
@Index(['classId'])
export class GroupStudent extends BaseEntity {
  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  studentUserProfileId: string;

  @Column({ type: 'uuid' })
  classId: string; // Denormalized from group for unique constraint

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt?: Date;

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
