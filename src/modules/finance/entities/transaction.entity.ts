import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Wallet } from './wallet.entity';
import { TransactionType } from '../enums/transaction-type.enum';
import { Money } from '@/shared/common/utils/money.util';

@Entity('transactions')
@Index(['fromWalletId'])
@Index(['toWalletId'])
@Index(['type'])
@Index(['correlationId'])
@Index(['createdAt'])
@Index(['correlationId', 'createdAt'])
export class Transaction extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  fromWalletId?: string;

  @Column({ type: 'uuid', nullable: true })
  toWalletId?: string;

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

  @Column({ type: 'varchar', length: 30 })
  type: TransactionType;

  @Column({ type: 'uuid' })
  correlationId: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    comment: 'Wallet balance after this transaction was applied',
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

  // Relations
  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn({ name: 'fromWalletId' })
  fromWallet?: Wallet;

  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn({ name: 'toWalletId' })
  toWallet?: Wallet;
}
