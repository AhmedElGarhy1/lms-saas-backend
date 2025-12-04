import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Center } from '@/modules/centers/entities/center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Class } from '@/modules/classes/entities/class.entity';

@Entity('subjects')
@Index(['centerId'])
@Index(['name', 'centerId'], { unique: true })
export class Subject extends BaseEntity {
  @Column({ type: 'uuid' })
  centerId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Relations
  @ManyToOne(() => Center, (center) => center.subjects, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @OneToMany(() => Class, (classEntity) => classEntity.subject)
  classes: Class[];
}
