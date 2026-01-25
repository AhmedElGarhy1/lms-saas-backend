import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Class } from './class.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { ScheduleItem } from './schedule-item.entity';
import { GroupStudent } from './group-student.entity';
import { SoftBaseEntity } from '@/shared/common/entities/soft-base.entity';
import { Session } from '@/modules/sessions/entities/session.entity';

@Entity('groups')
@Index(['classId'])
@Index(['branchId'])
@Index(['centerId'])
@Index(['classId', 'centerId'])
@Index(['name', 'createdAt']) // For alphabetical + chronological sorting
@Index(['name', 'classId'], { where: '"deletedAt" IS NULL', unique: true })
export class Group extends SoftBaseEntity {
  @Column({ type: 'uuid' })
  classId: string;

  @Column({ type: 'uuid' })
  branchId: string; // Denormalized from class

  @Column({ type: 'uuid' })
  centerId: string; // Denormalized from class

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Relations
  @ManyToOne(() => Class, (classEntity) => classEntity.groups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classId' })
  class: Class;

  @ManyToOne(() => Branch, (branch) => branch.groups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => Center, (center) => center.groups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @OneToMany(() => ScheduleItem, (scheduleItem) => scheduleItem.group, {
    cascade: true,
  })
  scheduleItems: ScheduleItem[];

  @OneToMany(() => GroupStudent, (groupStudent) => groupStudent.group, {
    cascade: true,
  })
  groupStudents: GroupStudent[];

  @OneToMany(() => Session, (session) => session.group)
  sessions: Session[];
}
