import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';

@Entity('wallets')
@Index(['ownerId', 'ownerType'], { unique: true })
@Index(['ownerId'])
@Index(['ownerType'])
export class Wallet extends BaseEntity {
  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'varchar', length: 20 })
  ownerType: WalletOwnerType;

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
  balance: Money;
}
