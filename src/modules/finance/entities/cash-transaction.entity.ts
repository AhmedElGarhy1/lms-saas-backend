import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Cashbox } from './cashbox.entity';
import { Payment } from './payment.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import {
  CashTransactionDirection,
  CashTransactionType,
} from '../enums/cash-transaction-direction.enum';
import { Money } from '@/shared/common/utils/money.util';

@Entity('cash_transactions')
@Index(['branchId'])
@Index(['cashboxId'])
@Index(['paymentId'])
@Index(['paidByProfileId'])
@Index(['direction'])
@Index(['type'])
@Index(['createdAt'])
export class CashTransaction extends BaseEntity {
  @Column({ type: 'uuid' })
  paymentId: string;

  @Column({ type: 'uuid' })
  branchId: string;

  @Column({ type: 'uuid' })
  cashboxId: string;

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
    type: 'decimal',
    precision: 12,
    scale: 2,
    comment: 'Cashbox balance after this transaction was applied',
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
  balanceAfter: Money;

  @Column({ type: 'varchar', length: 10 })
  direction: CashTransactionDirection;

  @Column({ type: 'uuid' })
  receivedByProfileId: string;

  @Column({ type: 'uuid', nullable: true })
  paidByProfileId?: string;

  @Column({ type: 'varchar', length: 20 })
  type: CashTransactionType;

  // Relations
  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @ManyToOne(() => Cashbox, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cashboxId' })
  cashbox: Cashbox;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'receivedByProfileId' })
  receivedByProfile: UserProfile;

  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'paidByProfileId' })
  paidByProfile?: UserProfile;
}
