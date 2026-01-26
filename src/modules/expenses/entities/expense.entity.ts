import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { Payment } from '@/modules/finance/entities/payment.entity';
import { ExpenseStatus } from '../enums/expense-status.enum';
import { ExpenseCategory } from '../enums/expense-category.enum';
import { Money } from '@/shared/common/utils/money.util';

@Entity('expenses')
@Index(['centerId'])
@Index(['branchId'])
@Index(['centerId', 'branchId'])
@Index(['status'])
@Index(['centerId', 'status'])
@Index(['category'])
@Index(['createdAt'])
@Index(['centerId', 'createdAt']) // For chronological sorting
export class Expense extends BaseEntity {
  @Column({ type: 'uuid' })
  centerId: string;

  @Column({ type: 'uuid' })
  branchId: string;

  @Column({
    type: 'varchar',
    length: 30,
  })
  category: ExpenseCategory;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

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

  @Column({
    type: 'varchar',
    length: 20,
    default: ExpenseStatus.PAID,
  })
  status: ExpenseStatus;

  @Column({ type: 'uuid' })
  paymentId: string;

  @Column({ type: 'timestamptz' })
  paidAt: Date;

  // Idempotency
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  @Index()
  idempotencyKey?: string;

  // Relations
  @ManyToOne(() => Center, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @ManyToOne(() => Branch, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => Payment, {
    onDelete: 'RESTRICT', // Prevent deletion of payment if expense exists
  })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;
}
