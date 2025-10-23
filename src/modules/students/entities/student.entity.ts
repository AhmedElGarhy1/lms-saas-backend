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

@Entity('students')
@Index(['studentId'])
export class Student extends BaseEntity {
  @Column({ unique: true, nullable: true })
  studentId?: string;

  @Column({ nullable: true })
  grade?: string;

  @Column({ nullable: true })
  class?: string;

  @Column({ nullable: true })
  enrollmentDate?: Date;

  @Column({ nullable: true })
  graduationDate?: Date;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'graduated', 'transferred'],
    default: 'active',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
