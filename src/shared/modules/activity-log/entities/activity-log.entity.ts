import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Center } from '@/modules/centers/entities/center.entity';

// ActivityType is now handled by domain-specific enums
// This allows each module to use its own enum while the database column accepts any string value

@Entity('activity_logs')
@Index(['type'])
@Index(['actorId'])
@Index(['userId'])
@Index(['centerId'])
@Index(['createdAt'])
@Index(['userId', 'centerId', 'type', 'createdAt'])
@Index(['actorId', 'centerId', 'type', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'uuid', nullable: true })
  centerId: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Center, { nullable: true })
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @CreateDateColumn()
  createdAt: Date;
}
