import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Group } from '@/modules/classes/entities/group.entity';
import { ScheduleItem } from '@/modules/classes/entities/schedule-item.entity';
import { SessionStatus } from '../enums/session-status.enum';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';

@Entity('sessions')
@Index(['groupId'])
@Index(['scheduleItemId'])
@Index(['startTime'])
@Index(['status'])
@Index(['groupId', 'status'])
@Index(['groupId', 'startTime'], { unique: true })
@Index(['centerId'])
@Index(['centerId', 'branchId'])
@Index(['centerId', 'classId'])
@Index(['centerId', 'branchId', 'classId'])
@Index(['classId'])
export class Session extends BaseEntity {
  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  centerId: string; // Denormalized from Group for performance and snapshot

  @Column({ type: 'uuid' })
  branchId: string; // Denormalized from Group for performance and snapshot

  @Column({ type: 'uuid' })
  classId: string; // Denormalized from Group for performance and snapshot

  @Column({ type: 'uuid' })
  teacherUserProfileId: string;

  @Column({ type: 'uuid', nullable: true })
  scheduleItemId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  actualStartTime?: Date; // Captured when session is actually started (status → CONDUCTING)

  @Column({ type: 'timestamptz', nullable: true })
  actualFinishTime?: Date; // Captured when session is actually finished (status → FINISHED)

  @Column({
    type: 'varchar',
    length: 20,
    default: SessionStatus.SCHEDULED,
  })
  status: SessionStatus;

  @Column({ type: 'boolean', default: false })
  isExtraSession: boolean;

  // Relations
  @ManyToOne(() => Group, (group) => group.sessions)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => Class, (classEntity) => classEntity.sessions)
  @JoinColumn({ name: 'classId' })
  class: Class;

  @ManyToOne(() => UserProfile, (userProfile) => userProfile.sessionsAsTeacher)
  @JoinColumn({ name: 'teacherUserProfileId' })
  teacher: UserProfile;

  @ManyToOne(() => Center, (center) => center.sessions)
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @ManyToOne(() => Branch, (branch) => branch.sessions)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => ScheduleItem, (scheduleItem) => scheduleItem.sessions)
  @JoinColumn({ name: 'scheduleItemId' })
  scheduleItem: ScheduleItem;
}
