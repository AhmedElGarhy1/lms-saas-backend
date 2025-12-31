import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Money } from '@/shared/common/utils/money.util';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

export enum BillingRecordType {
  MONTHLY = 'MONTHLY',
  SESSION = 'SESSION',
}

export enum PaymentSource {
  WALLET = 'WALLET',
  CASH = 'CASH',
}

@Entity('student_billing_records')
export class StudentBillingRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  studentUserProfileId: string;

  @Column('uuid')
  @Index()
  classId: string;

  @Column('uuid', { nullable: true })
  @Index()
  sessionId?: string; // null for monthly records

  @Column()
  type: BillingRecordType;

  @Column()
  paymentSource: PaymentSource;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      from: (value: string | null): Money | null => {
        return value === null ? null : Money.from(value);
      },
      to: (value: Money | number | string | null): string | null => {
        if (value === null) return null;
        if (value instanceof Money) return value.toString();
        return Money.from(value).toString();
      },
    },
  })
  amount: Money;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'studentUserProfileId' })
  studentUserProfile: UserProfile;
}
