import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { Session } from '@/modules/sessions/entities/session.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { PayoutStatus } from '../enums/payout-status.enum';

export enum PaymentSource {
  WALLET = 'WALLET',
  CASH = 'CASH',
}

@Entity('teacher_payout_records')
@Index(['teacherUserProfileId', 'status']) // For efficient queries
@Index(['classId'])
@Index(['status'])
export class TeacherPayoutRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  teacherUserProfileId: string;

  @Column({ type: 'enum', enum: TeacherPaymentUnit })
  unitType: TeacherPaymentUnit;

  // Financial Duo
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitCount: number;

  @Column({ type: 'uuid' })
  classId: string;

  @Column({ type: 'uuid', nullable: true })
  sessionId?: string;

  @Column({ type: 'int', nullable: true })
  month?: number;

  @Column({ type: 'int', nullable: true })
  year?: number;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Column('uuid')
  branchId: string; // Denormalized: Branch responsible for payment

  @Column('uuid')
  centerId: string; // Denormalized: Center owning the branch

  @Column({ type: 'enum', enum: PaymentSource, nullable: true })
  paymentSource?: PaymentSource; // WALLET or CASH, null initially

  @Column({ type: 'uuid', nullable: true })
  paymentId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'teacherUserProfileId' })
  teacher: UserProfile;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'classId' })
  class: Class;

  @ManyToOne(() => Session)
  @JoinColumn({ name: 'sessionId' })
  session?: Session;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => Center)
  @JoinColumn({ name: 'centerId' })
  center: Center;
}
