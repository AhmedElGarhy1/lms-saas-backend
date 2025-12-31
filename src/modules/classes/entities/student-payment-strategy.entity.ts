import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Class } from './class.entity';

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

  @Column({ type: 'boolean', default: true })
  includePackage: boolean; // Allow package purchases for this class

  @Column({ type: 'boolean', default: true })
  includeSession: boolean; // Allow per-session payments

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  sessionPrice?: number; // Price per session (when includeSession = true)

  @Column({ type: 'boolean', default: false })
  includeMonth: boolean; // Allow monthly subscriptions

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  monthPrice?: number; // Monthly subscription price (when includeMonth = true)

  // Relations
  @OneToOne(() => Class, (classEntity) => classEntity.studentPaymentStrategy, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classId' })
  class: Class;
}
