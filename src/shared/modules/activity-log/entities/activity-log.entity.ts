import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../../modules/user/entities/user.entity';
import { Center } from '../../../../modules/access-control/entities/center.entity';

export enum ActivityType {
  // User activities
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',
  USER_PROFILE_CREATED = 'USER_PROFILE_CREATED',
  USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED',

  // Center activities
  CENTER_CREATED = 'CENTER_CREATED',
  CENTER_UPDATED = 'CENTER_UPDATED',
  CENTER_DELETED = 'CENTER_DELETED',
  CENTER_ACTIVATED = 'CENTER_ACTIVATED',
  CENTER_DEACTIVATED = 'CENTER_DEACTIVATED',
  CENTER_ADMIN_CREATED = 'CENTER_ADMIN_CREATED',
  CENTER_ADMIN_ASSIGNED = 'CENTER_ADMIN_ASSIGNED',
  CENTER_ADMIN_REMOVED = 'CENTER_ADMIN_REMOVED',
  CENTER_USER_ASSIGNED = 'CENTER_USER_ASSIGNED',
  CENTER_USER_REMOVED = 'CENTER_USER_REMOVED',

  // Role activities
  ROLE_CREATED = 'ROLE_CREATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  ROLE_DELETED = 'ROLE_DELETED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',
  ROLE_PERMISSIONS_UPDATED = 'ROLE_PERMISSIONS_UPDATED',

  // Permission activities
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',

  // Access control activities
  USER_ACCESS_GRANTED = 'USER_ACCESS_GRANTED',
  USER_ACCESS_REVOKED = 'USER_ACCESS_REVOKED',
  CENTER_ACCESS_GRANTED = 'CENTER_ACCESS_GRANTED',
  CENTER_ACCESS_REVOKED = 'CENTER_ACCESS_REVOKED',

  // System activities
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_RESTORE = 'SYSTEM_RESTORE',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export enum ActivityLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum ActivityScope {
  GLOBAL = 'GLOBAL',
  CENTER = 'CENTER',
  USER = 'USER',
}

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  type: ActivityType;

  @Column({
    type: 'enum',
    enum: ActivityLevel,
    default: ActivityLevel.INFO,
  })
  level: ActivityLevel;

  @Column({
    type: 'enum',
    enum: ActivityScope,
  })
  scope: ActivityScope;

  @Column()
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  details: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Actor (who performed the action)
  @Column({ nullable: true })
  actorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  // Target (what was affected)
  @Column({ nullable: true })
  targetUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'targetUserId' })
  targetUser: User;

  // Center context (if applicable)
  @Column({ nullable: true })
  centerId: string;

  @ManyToOne(() => Center, { nullable: true })
  @JoinColumn({ name: 'centerId' })
  center: Center;

  // IP address and user agent for security tracking
  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
