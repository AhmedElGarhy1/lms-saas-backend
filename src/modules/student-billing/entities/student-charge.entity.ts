import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Entity, Column, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Payment } from '@/modules/finance/entities/payment.entity';
import {
  StudentChargeType,
  StudentChargeStatus,
} from '../enums';
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';
import { Class } from '@/modules/classes/entities/class.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Session } from '@/modules/sessions/entities/session.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { Center } from '@/modules/centers/entities/center.entity';

@Entity('student_charges')
@Index(['amount']) // For amount-based sorting
@Index(['createdAt']) // For chronological sorting
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

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalPaid: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  lastPaymentAmount?: number;

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

  @ManyToOne(() => Class, (classEntity) => classEntity.studentCharges)
  @JoinColumn({ name: 'classId' })
  class: Class;

  @ManyToOne(() => Session, (session) => session.studentCharges)
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @ManyToOne(() => UserProfile, (userProfile) => userProfile.studentCharges)
  @JoinColumn({ name: 'studentUserProfileId' })
  student: UserProfile;

  @ManyToOne(() => Branch, (branch) => branch.studentCharges)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => Center, (center) => center.studentCharges)
  @JoinColumn({ name: 'centerId' })
  center: Center;

  // Relationship to all payments made for this charge
  @OneToMany(() => Payment, (payment) => payment.studentCharge)
  payments: Payment[];
}
