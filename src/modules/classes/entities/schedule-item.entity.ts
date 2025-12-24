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
import { Class } from './class.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

@Entity('schedule_items')
@Index(['groupId'])
@Index(['groupId', 'day'])
export class ScheduleItem extends BaseEntity {
  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  centerId: string;

  @Column({ type: 'uuid' })
  classId: string;

  @Column({ type: 'uuid' })
  branchId: string;

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

  @ManyToOne(() => Class, (classEntity) => classEntity.scheduleItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classId' })
  class: Class;

  @ManyToOne(() => Branch, (branch) => branch.scheduleItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => Center, (center) => center.scheduleItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;
}
