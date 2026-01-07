import { BaseEntity } from '@/shared/common/entities/base.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

export enum StudentChargeType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  SESSION = 'SESSION',
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
export class StudentCharge extends BaseEntity {
  @Column('uuid')
  @Index()
  studentUserProfileId: string;

  // Type discriminator
  @Column({ type: 'simple-enum', enum: StudentChargeType })
  @Index()
  chargeType: StudentChargeType;

  // Denormalized access control fields
  @Column('uuid')
  @Index()
  centerId: string;

  @Column('uuid')
  @Index()
  branchId: string;

  @Column('uuid')
  @Index()
  classId: string; // Required for all charge types

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

  @Column('int', { nullable: true })
  month?: number; // Only for MONTHLY charges (1-12)

  @Column('int', { nullable: true })
  year?: number; // Only for MONTHLY charges

  // Audit fields
  @Column('timestamptz', { nullable: true })
  refundedAt?: Date;

  @Column('text', { nullable: true })
  refundReason?: string;
}
