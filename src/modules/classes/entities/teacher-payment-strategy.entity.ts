import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Class } from './class.entity';
import { TeacherPaymentUnit } from '../enums/teacher-payment-unit.enum';

@Entity('teacher_payment_strategies')
@Index(['classId'])
export class TeacherPaymentStrategy extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  classId: string;

  @Column({
    type: 'enum',
    enum: TeacherPaymentUnit,
  })
  per: TeacherPaymentUnit;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  // Relations
  @OneToOne(() => Class, (classEntity) => classEntity.teacherPaymentStrategy, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classId' })
  class: Class;
}
