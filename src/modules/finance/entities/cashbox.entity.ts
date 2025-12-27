import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { Money } from '@/shared/common/utils/money.util';

@Entity('cashboxes')
@Index(['branchId'], { unique: true })
export class Cashbox extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  branchId: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: '0.00',
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

  @Column({ type: 'timestamptz', nullable: true })
  lastAuditedAt?: Date;

  // Relations
  @ManyToOne(() => Branch, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;
}

