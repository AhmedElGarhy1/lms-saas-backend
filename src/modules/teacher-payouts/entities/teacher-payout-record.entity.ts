import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { Session } from '@/modules/sessions/entities/session.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { PayoutStatus } from '../enums/payout-status.enum';
import { Payment } from '@/modules/finance/entities/payment.entity';
import { Money } from '@/shared/common/utils/money.util';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('teacher_payout_records')
@Index(['teacherUserProfileId', 'status']) // For efficient queries
@Index(['classId'])
@Index(['status'])
@Index(['unitPrice']) // For price-based sorting
@Index(['unitCount']) // For count-based sorting
@Index(['createdAt']) // For chronological sorting
export class TeacherPayoutRecord extends BaseEntity {
  @Column('uuid')
  teacherUserProfileId: string;

  @Column({ type: 'enum', enum: TeacherPaymentUnit })
  unitType: TeacherPaymentUnit;

  // Financial fields
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice?: number; // Total amount for CLASS payouts

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitCount: number;

  @Column({ type: 'uuid' })
  classId: string;

  @Column({ type: 'uuid', nullable: true })
  sessionId?: string;

  @Column({ type: 'int', nullable: true })
  month?: number;

  @Column({ type: 'int', nullable: true })
  year?: number;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Column('uuid')
  branchId: string; // Denormalized: Branch responsible for payment

  @Column('uuid')
  centerId: string; // Denormalized: Center owning the branch

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      from: (value: string): Money => Money.from(value),
      to: (value: Money | number | string): string => {
        if (value instanceof Money) return value.toString();
        return Money.from(value).toString();
      },
    },
  })
  totalPaid: Money; // Cumulative amount paid so far

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      from: (value: string | null): Money | null => {
        return value === null ? null : Money.from(value);
      },
      to: (
        value: Money | number | string | null | undefined,
      ): string | null => {
        if (value == null) return null; // handles both null and undefined
        if (value instanceof Money) return value.toString();
        return Money.from(value).toString();
      },
    },
  })
  lastPaymentAmount?: Money; // Most recent payment amount

  // Idempotency
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  @Index()
  idempotencyKey?: string;

  // Relations
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'teacherUserProfileId' })
  teacher: UserProfile;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'classId' })
  class: Class;

  @ManyToOne(() => Session)
  @JoinColumn({ name: 'sessionId' })
  session?: Session;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => Center)
  @JoinColumn({ name: 'centerId' })
  center: Center;

  // Relationship to all payments made for this payout
  @OneToMany(() => Payment, (payment) => payment.teacherPayout)
  payments: Payment[];
}
