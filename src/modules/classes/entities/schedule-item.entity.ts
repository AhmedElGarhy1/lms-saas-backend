import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Group } from './group.entity';
import { DayOfWeek } from '../enums/day-of-week.enum';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Session } from '@/modules/sessions/entities/session.entity';

@Entity('schedule_items')
@Index(['groupId'])
@Index(['groupId', 'day'])
export class ScheduleItem extends BaseEntity {
  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'varchar', length: 10 })
  day: DayOfWeek;

  @Column({ type: 'varchar', length: 8 })
  startTime: string; // Format: "HH:mm"

  // Relations
  @ManyToOne(() => Group, (group) => group.scheduleItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @OneToMany(() => Session, (session) => session.scheduleItem)
  sessions: Session[];
}
