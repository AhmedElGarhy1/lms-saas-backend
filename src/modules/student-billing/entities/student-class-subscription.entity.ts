import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentSource {
  WALLET = 'WALLET',
  CASH = 'CASH',
}

@Entity('student_class_subscriptions')
@Index(['studentUserProfileId', 'classId', 'status']) // Composite index for fast lookup during checkIn
export class StudentClassSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  studentUserProfileId: string;

  @Column('uuid')
  @Index()
  classId: string;

  @Column('int')
  @Index()
  month: number; // 1-12 (calendar month)

  @Column('int')
  @Index()
  year: number; // e.g., 2024, 2025

  @Column({
    type: 'simple-enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({
    type: 'simple-enum',
    enum: PaymentSource,
  })
  paymentSource: PaymentSource;

  @Column('uuid')
  paymentId: string; // References Finance.Payment

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
