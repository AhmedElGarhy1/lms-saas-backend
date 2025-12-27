import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { WebhookProvider } from '../enums/webhook-provider.enum';
import { WebhookStatus } from '../enums/webhook-status.enum';

@Entity('webhook_attempts')
@Index(['provider', 'externalId'], { unique: true })
@Index(['status'])
@Index(['nextRetryAt'])
@Index(['createdAt'])
export class WebhookAttempt extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 20,
    enum: WebhookProvider,
  })
  provider: WebhookProvider;

  @Column({ type: 'varchar', length: 255 })
  externalId: string; // Stripe payment_intent.id or M-Pesa transaction ID

  @Column({
    type: 'varchar',
    length: 20,
    enum: WebhookStatus,
    default: WebhookStatus.RECEIVED,
  })
  status: WebhookStatus;

  @Column({ type: 'jsonb' })
  payload: any; // Full webhook payload for replay

  @Column({ type: 'varchar', length: 255, nullable: true })
  signature?: string; // HMAC signature for verification

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string; // IP address for security logging

  @Column({ type: 'int', default: 1 })
  attemptCount: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  processingResult?: any; // Result of successful processing
}
