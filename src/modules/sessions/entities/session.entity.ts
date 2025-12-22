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
export class Session extends BaseEntity {
  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid', nullable: true })
  scheduleItemId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
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
