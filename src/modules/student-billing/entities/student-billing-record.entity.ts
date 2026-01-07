import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

export enum StudentChargeType {
  SESSION = 'SESSION',
  MONTHLY = 'MONTHLY',
  CLASS = 'CLASS',
}

export enum StudentChargeStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentSource {
  WALLET = 'WALLET',
  CASH = 'CASH',
}

@Entity('student_charges')
export class StudentCharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  studentUserProfileId: string;

  // Type discriminator
  @Column({ type: 'simple-enum', enum: StudentChargeType })
  @Index()
  chargeType: StudentChargeType;

  // Common payment fields
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'simple-enum', enum: PaymentSource })
  paymentSource: PaymentSource;

  @Column('uuid', { nullable: true })
  paymentId?: string;

  @Column({
    type: 'simple-enum',
    enum: StudentChargeStatus,
    default: StudentChargeStatus.PENDING,
  })
  @Index()
  status: StudentChargeStatus;

  // Type-specific fields (nullable based on chargeType)
  @Column('uuid', { nullable: true })
  @Index()
  sessionId?: string; // Only for SESSION charges

  @Column('uuid', { nullable: true })
  @Index()
  classId?: string; // For SESSION/MONTHLY/CLASS charges

  @Column('int', { nullable: true })
  month?: number; // Only for MONTHLY charges (1-12)

  @Column('int', { nullable: true })
  year?: number; // Only for MONTHLY charges

  // Audit fields
  @Column('timestamptz', { nullable: true })
  refundedAt?: Date;

  @Column('text', { nullable: true })
  refundReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
