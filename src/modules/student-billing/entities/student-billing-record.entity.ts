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
import { StudentPaymentStrategy } from '@/modules/classes/entities/student-payment-strategy.entity';

export enum StudentBillingType {
  MONTHLY = 'MONTHLY',
  SESSION = 'SESSION',
  CLASS = 'CLASS',
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

  @Column()
  type: StudentBillingType; // Type of billing: session/monthly/class

  @Column('uuid')
  @Index()
  refId: string; // Reference ID (strategy ID for all types)

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

  @ManyToOne(() => StudentPaymentStrategy)
  @JoinColumn({ name: 'refId' })
  strategy: StudentPaymentStrategy;
}
