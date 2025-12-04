import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Class } from './class.entity';
import { StudentPaymentUnit } from '../enums/student-payment-unit.enum';

@Entity('student_payment_strategies')
@Index(['classId'])
export class StudentPaymentStrategy extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  classId: string;

  @Column({
    type: 'enum',
    enum: StudentPaymentUnit,
  })
  per: StudentPaymentUnit;

  @Column({ type: 'integer', nullable: true })
  count?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  // Relations
  @OneToOne(() => Class, (classEntity) => classEntity.studentPaymentStrategy, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classId' })
  class: Class;
}
