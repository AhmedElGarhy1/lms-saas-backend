import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Group } from '@/modules/classes/entities/group.entity';
import { ScheduleItem } from '@/modules/classes/entities/schedule-item.entity';
import { SessionStatus } from '../enums/session-status.enum';

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

  @Column({ type: 'uuid', nullable: true })
  scheduleItemId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  
  @Column({ type: 'timestamptz' })
  startTime: Date;

  
  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: SessionStatus.SCHEDULED,
  })
  status: SessionStatus;

  @Column({ type: 'boolean', default: false })
  isExtraSession: boolean;

  // Relations
  @ManyToOne(() => Group)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => ScheduleItem, { nullable: true })
  @JoinColumn({ name: 'scheduleItemId' })
  scheduleItem?: ScheduleItem;
}
