import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { VerificationType } from '../enums/verification-type.enum';
import { NotificationChannel } from '../../notifications/enums/notification-channel.enum';

@Entity('verification_tokens')
@Index(['userId'])
@Index(['token'])
@Index(['type'])
@Index(['channel'])
@Index(['expiresAt'])
@Index(['userId', 'type'])
@Index(['userId', 'type', 'channel'], { unique: true })
export class VerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: VerificationType;

  @Column({
    type: 'varchar',
    length: 20,
  })
  channel: NotificationChannel;

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  code: string | null; // For OTP codes

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.verificationTokens)
  @JoinColumn({ name: 'userId' })
  user: User;
}
