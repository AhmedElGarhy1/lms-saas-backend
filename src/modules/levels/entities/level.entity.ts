import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Center } from '@/modules/centers/entities/center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('levels')
@Index(['centerId'])
@Index(['name', 'centerId'], { unique: true })
export class Level extends BaseEntity {
  @Column({ type: 'uuid' })
  centerId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Relations
  @ManyToOne(() => Center, (center) => center.levels, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;
}

