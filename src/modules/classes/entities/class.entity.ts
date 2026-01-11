import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { Level } from '@/modules/levels/entities/level.entity';
import { Subject } from '@/modules/subjects/entities/subject.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Group } from './group.entity';
import { StudentPaymentStrategy } from './student-payment-strategy.entity';
import { TeacherPaymentStrategy } from './teacher-payment-strategy.entity';
import { ClassStaff } from './class-staff.entity';
import { SoftBaseEntity } from '@/shared/common/entities/soft-base.entity';
import { ClassStatus } from '../enums/class-status.enum';
import { ScheduleItem } from './schedule-item.entity';
import { Session } from '@/modules/sessions/entities/session.entity';
import { StudentCharge } from '@/modules/student-billing/entities/student-charge.entity';
import { TeacherPayoutRecord } from '@/modules/teacher-payouts/entities/teacher-payout-record.entity';

@Entity('classes')
@Index(['centerId'])
@Index(['branchId'])
@Index(['levelId'])
@Index(['subjectId'])
@Index(['teacherUserProfileId'])
@Index(['centerId', 'branchId'])
@Index(['status'])
@Index(['centerId', 'status'])
export class Class extends SoftBaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: ClassStatus.PENDING_TEACHER_APPROVAL,
  })
  status: ClassStatus;

  @Column({ type: 'uuid' })
  levelId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid' })
  teacherUserProfileId: string;

  @Column({ type: 'uuid' })
  branchId: string;

  @Column({ type: 'uuid' })
  centerId: string;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endDate?: Date;

  @Column({ type: 'int' })
  duration: number; // Duration in minutes

  // Relations
  @ManyToOne(() => Level, (level) => level.classes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'levelId' })
  level: Level;

  @ManyToOne(() => Subject, (subject) => subject.classes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @ManyToOne(() => UserProfile, (userProfile) => userProfile.classesAsTeacher, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teacherUserProfileId' })
  teacher: UserProfile;

  @ManyToOne(() => Branch, (branch) => branch.classes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => Center, (center) => center.classes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @OneToMany(() => Group, (group) => group.class)
  groups: Group[];

  @OneToOne(() => StudentPaymentStrategy, (strategy) => strategy.class, {
    cascade: true,
  })
  studentPaymentStrategy: StudentPaymentStrategy;

  @OneToOne(() => TeacherPaymentStrategy, (strategy) => strategy.class, {
    cascade: true,
  })
  teacherPaymentStrategy: TeacherPaymentStrategy;

  @OneToMany(() => ClassStaff, (classStaff) => classStaff.class)
  classStaff: ClassStaff[];

  @OneToMany(() => ScheduleItem, (scheduleItem) => scheduleItem.class)
  scheduleItems: ScheduleItem[];

  @OneToMany(() => Session, (session) => session.class)
  sessions: Session[];

  @OneToMany(() => StudentCharge, (studentCharge) => studentCharge.class)
  studentCharges: StudentCharge[];

  @OneToMany(
    () => TeacherPayoutRecord,
    (teacherPayoutRecord) => teacherPayoutRecord.class,
  )
  teacherPayoutRecords: TeacherPayoutRecord[];
}
