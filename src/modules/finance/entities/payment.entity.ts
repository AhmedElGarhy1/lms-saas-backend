import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentReason } from '../enums/payment-reason.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentReferenceType } from '../enums/payment-reference-type.enum';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { TeacherPayoutRecord } from '@/modules/teacher-payouts/entities/teacher-payout-record.entity';
import { StudentCharge } from '@/modules/student-billing/entities/student-charge.entity';

@Entity('payments')
@Index(['senderId', 'senderType'])
@Index(['senderId', 'createdAt']) // Composite index for payment history queries
@Index(['receiverId', 'receiverType'])
@Index(['status'])
@Index(['referenceType', 'referenceId'])
@Index(['createdAt'])
@Index(['amount']) // For amount-based sorting and filtering
@Index(['correlationId'])
@Index(['idempotencyKey'], { unique: true })
export class Payment extends BaseEntity {
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      from: (value: string | null): Money | null => {
        return value === null ? null : Money.from(value);
      },
      to: (value: Money | number | string | null): string | null => {
        if (value === null) return null;
        if (value instanceof Money) return value.toString();
        return Money.from(value).toString();
      },
    },
  })
  amount: Money;

  @Column({ type: 'uuid' })
  senderId: string;

  @Column({ type: 'varchar', length: 20 })
  senderType: WalletOwnerType;

  @Column({ type: 'uuid' })
  receiverId: string;

  @Column({ type: 'varchar', length: 20 })
  receiverType: WalletOwnerType;

  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 30 })
  reason: PaymentReason;

  @Column({ type: 'varchar', length: 20 })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 20, nullable: true })
  referenceType?: PaymentReferenceType;

  @Column({ type: 'uuid', nullable: true })
  referenceId?: string;

  @Column({ type: 'uuid', nullable: true })
  correlationId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  idempotencyKey?: string;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Relationship to teacher payout (for TEACHER_PAYOUT reference type)
  @ManyToOne(() => TeacherPayoutRecord, (payout) => payout.payments, {
    nullable: true,
  })
  teacherPayout?: TeacherPayoutRecord;

  // Relationship to student charge (for STUDENT_CHARGE reference type)
  @ManyToOne(() => StudentCharge, (charge) => charge.payments, {
    nullable: true,
  })
  studentCharge?: StudentCharge;
}
