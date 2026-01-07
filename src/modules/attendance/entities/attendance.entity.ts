import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { AttendanceStatus } from '../enums/attendance-status.enum';
import { Session } from '@/modules/sessions/entities/session.entity';
import { Group } from '@/modules/classes/entities/group.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

@Entity('attendance')
@Index(['centerId'])
@Index(['centerId', 'branchId'])
@Index(['groupId'])
@Index(['sessionId'])
@Index(['studentUserProfileId'])
@Index(['status'])
@Index(['sessionId', 'studentUserProfileId'], { unique: true })
export class Attendance extends BaseEntity {
  @Column({ type: 'uuid' })
  centerId: string;

  @Column({ type: 'uuid' })
  branchId: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'uuid' })
  studentUserProfileId: string;

  @Column({ type: 'varchar', length: 20 })
  status: AttendanceStatus;

  @Column({ type: 'uuid', nullable: true })
  markedByUserProfileId?: string;

  // Relations
  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentUserProfileId' })
  student: UserProfile;

  @ManyToOne(() => UserProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'markedByUserProfileId' })
  markedBy?: UserProfile;
}
