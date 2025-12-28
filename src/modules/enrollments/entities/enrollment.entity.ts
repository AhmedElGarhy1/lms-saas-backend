import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Session } from '@/modules/sessions/entities/session.entity';
import { StudentPackage } from '@/modules/packages/entities/student-package.entity';
import { Money } from '@/shared/common/utils/money.util';

export enum PaymentMethod {
  PACKAGE = 'PACKAGE',
  WALLET = 'WALLET',
  CASH = 'CASH',
}

export enum EnrollmentStatus {
  LOCKED = 'LOCKED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

@Entity('enrollments')
@Index(['studentId'])
@Index(['sessionId'])
@Index(['packageId'])
@Index(['status'])
@Index('IDX_enrollments_unique', ['sessionId', 'studentId'], { unique: true })
export class Enrollment extends BaseEntity {
  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'varchar', length: 20 })
  paymentMethod: PaymentMethod;

  @Column({ type: 'uuid', nullable: true })
  packageId?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: EnrollmentStatus.LOCKED,
  })
  status: EnrollmentStatus;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      from: (value: string): Money => Money.from(value),
      to: (value: Money | number | string): string => {
        if (value instanceof Money) return value.toString();
        return Money.from(value).toString();
      },
    },
  })
  amount: Money; // 0 for packages, actual amount for wallet/cash

  @Column({ type: 'uuid', nullable: true })
  transactionId?: string; // FK to transactions table (for Wallet)

  @Column({ type: 'uuid', nullable: true })
  cashTransactionId?: string; // FK to cash_transactions table (for Cash)

  // Enrollment-specific fields
  @Column({ type: 'boolean', default: false })
  isAttended: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  checkedInAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  // Relations
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: UserProfile;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @ManyToOne(() => StudentPackage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'packageId' })
  studentPackage?: StudentPackage;
}
