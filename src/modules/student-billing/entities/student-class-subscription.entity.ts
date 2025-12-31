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

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

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

  // Month-Year field for calendar month logic (e.g., "2025-12")
  // This makes checking for duplicate subscriptions for the same month much faster
  @Column('varchar', { length: 7 }) // Format: YYYY-MM
  @Index()
  monthYear: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
