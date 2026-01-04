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
import { ChargeStatus, PaymentSource } from './student-session-charge.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Class } from '@/modules/classes/entities/class.entity';

@Entity('student_class_charges')
@Index(['studentUserProfileId', 'classId']) // Unique constraint for one charge per student per class
export class StudentClassCharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  studentUserProfileId: string;

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

  @Column('uuid', { nullable: true })
  paymentId?: string; // References Finance.Payment

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

  // Relations
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'studentUserProfileId' })
  student: UserProfile;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'classId' })
  class: Class;
}
