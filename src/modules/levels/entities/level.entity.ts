import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Center } from '@/modules/centers/entities/center.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { SoftBaseEntity } from '@/shared/common/entities/soft-base.entity';

@Entity('levels')
@Index(['centerId'])
@Index(['name', 'centerId'], { unique: true })
@Index(['name', 'createdAt']) // For alphabetical + chronological sorting
export class Level extends SoftBaseEntity {
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

  @OneToMany(() => Class, (classEntity) => classEntity.level)
  classes: Class[];
}
