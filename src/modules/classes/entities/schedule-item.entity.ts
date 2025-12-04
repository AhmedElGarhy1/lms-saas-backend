import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Group } from './group.entity';
import { DayOfWeek } from '../enums/day-of-week.enum';

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

  @Column({ type: 'varchar', length: 8 })
  endTime: string; // Format: "HH:mm"

  // Relations
  @ManyToOne(() => Group, (group) => group.scheduleItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: Group;
}
