import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { Money } from '@/shared/common/utils/money.util';

@Entity('class_packages')
@Index(['classId'])
@Index(['isActive'])
export class ClassPackage extends BaseEntity {
  @Column({ type: 'uuid' })
  classId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int4' })
  sessionCount: number;

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
  price: Money;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class: Class;
}
