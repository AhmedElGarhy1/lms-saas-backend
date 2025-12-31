import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ChargeStatus {
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentSource {
  WALLET = 'WALLET',
  CASH = 'CASH',
}

@Entity('student_session_charges')
@Index(['studentUserProfileId', 'sessionId', 'status']) // Composite index for fast lookup during checkIn
export class StudentSessionCharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  studentUserProfileId: string;

  @Column('uuid')
  @Index()
  sessionId: string;

  @Column('uuid')
  @Index()
  classId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'simple-enum',
    enum: PaymentSource,
  })
  paymentSource: PaymentSource;

  @Column('uuid')
  paymentId: string; // References Finance.Payment

  @Column({
    type: 'simple-enum',
    enum: ChargeStatus,
    default: ChargeStatus.PAID,
  })
  status: ChargeStatus;

  @Column('timestamp', { nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
