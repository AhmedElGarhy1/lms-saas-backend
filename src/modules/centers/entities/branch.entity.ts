import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  AfterLoad,
} from 'typeorm';
import { Center } from './center.entity';
import { BranchAccess } from './branch-access.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { Group } from '@/modules/classes/entities/group.entity';
import { SoftBaseEntity } from '@/shared/common/entities/soft-base.entity';
import { ScheduleItem } from '@/modules/classes/entities/schedule-item.entity';
import { Session } from '@/modules/sessions/entities/session.entity';
import { StudentCharge } from '@/modules/student-billing/entities/student-charge.entity';
import { TeacherPayoutRecord } from '@/modules/teacher-payouts/entities/teacher-payout-record.entity';
import { ClassStaff } from '@/modules/classes/entities/class-staff.entity';

@Entity('branches')
@Index(['centerId'])
@Index(['isActive'])
@Index(['city'])
@Index(['centerId', 'isActive'])
export class Branch extends SoftBaseEntity {
  @Column({ type: 'uuid' })
  centerId: string;

  @Column({ type: 'varchar', length: 255 })
  city: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  // Relations
  @ManyToOne(() => Center, (center) => center.branches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @OneToMany(() => BranchAccess, (access) => access.branch)
  branchAccess: BranchAccess[];

  @OneToMany(() => Class, (classEntity) => classEntity.branch)
  classes: Class[];

  @OneToMany(() => Group, (group) => group.branch)
  groups: Group[];

  @OneToMany(() => ScheduleItem, (scheduleItem) => scheduleItem.branch)
  scheduleItems: ScheduleItem[];

  @OneToMany(() => Session, (session) => session.branch)
  sessions: Session[];

  @OneToMany(() => StudentCharge, (studentCharge) => studentCharge.branch)
  studentCharges: StudentCharge[];

  @OneToMany(
    () => TeacherPayoutRecord,
    (teacherPayoutRecord) => teacherPayoutRecord.branch,
  )
  teacherPayoutRecords: TeacherPayoutRecord[];

  @OneToMany(() => ClassStaff, (classStaff) => classStaff.branch)
  classStaff: ClassStaff[];

  @OneToMany(() => Session, (session) => session.branch)

  // virtual fields
  name: string;

  @AfterLoad()
  virtualFields() {
    this.name = `${this.city}${this.address ? ` - ${this.address}` : ''}`;
  }
}
