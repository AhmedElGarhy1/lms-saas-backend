import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Payment } from './payment.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { TransitionType } from '../enums/transition-type.enum';

@Entity('payment_status_changes')
@Index(['paymentId'])
@Index(['changedByUserId'])
@Index(['createdAt'])
export class PaymentStatusChange extends BaseEntity {
  @Column({ type: 'uuid' })
  paymentId: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: PaymentStatus,
  })
  oldStatus: PaymentStatus;

  @Column({
    type: 'varchar',
    length: 20,
    enum: PaymentStatus,
  })
  newStatus: PaymentStatus;

  @Column({
    type: 'varchar',
    length: 20,
    enum: TransitionType,
  })
  transitionType: TransitionType;

  @Column({ type: 'uuid' })
  changedByUserId: string;

  @Column({ type: 'text', nullable: true })
  reason?: string; // Business reason for the change

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // Additional context

  // Relations
  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'paymentId' })
  payment?: Payment;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'changedByUserId' })
  changedByUser?: UserProfile;
}
