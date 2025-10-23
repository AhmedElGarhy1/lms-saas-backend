import { BaseEntity } from '@/shared/common/entities/base.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity('teachers')
@Index(['teacherId'])
export class Teacher extends BaseEntity {
  @Column({ unique: true, nullable: true })
  teacherId?: string;

  @Column({ nullable: true })
  department?: string;

  @Column({ nullable: true })
  subject?: string;

  @Column({ nullable: true })
  hireDate?: Date;

  @Column({ nullable: true })
  salary?: number;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'text', nullable: true })
  qualifications?: string;
}
