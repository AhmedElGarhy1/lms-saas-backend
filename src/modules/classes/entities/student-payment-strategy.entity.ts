import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Class } from './class.entity';
import { StudentPaymentUnit } from '../enums/student-payment-unit.enum';

@Entity('student_payment_strategies')
@Index(['classId'])
@Index(['centerId'])
@Index(['centerId', 'branchId'])
export class StudentPaymentStrategy extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  classId: string;

  @Column({ type: 'uuid' })
  centerId: string; // Denormalized from Class for performance and snapshot

  @Column({ type: 'uuid' })
  branchId: string; // Denormalized from Class for performance and snapshot

  @Column({
    type: 'enum',
    enum: StudentPaymentUnit,
  })
  per: StudentPaymentUnit;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      // Convert database string to number when reading
      from: (value: string | null): number | null => {
        return value === null ? null : parseFloat(value);
      },
      // Convert number to string when writing
      to: (value: number | null): string | null => {
        return value === null ? null : value.toString();
      },
    },
  })
  amount: number;

  // Relations
  @OneToOne(() => Class, (classEntity) => classEntity.studentPaymentStrategy, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classId' })
  class: Class;
}
