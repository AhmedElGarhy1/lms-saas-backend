import { Entity, Column, OneToMany, OneToOne, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Center } from '@/modules/centers/entities/center.entity';
import { EmailVerification } from '@/modules/auth/entities/email-verification.entity';
import { PasswordResetToken } from '@/modules/auth/entities/password-reset-token.entity';
import { UserProfile } from './user-profile.entity';
import { UserInfo } from './user-info.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('users')
@Index(['email'], { where: 'email IS NOT NULL', unique: true })
@Index(['phone'])
@Index(['isActive'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 12 })
  phone: string;

  @Column({ type: 'varchar', length: 255, select: false })
  @Exclude()
  password: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lockoutUntil: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  @Exclude()
  twoFactorSecret: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  @Exclude()
  hashedRt: string | null;

  // Relations
  @OneToMany(() => Center, (center) => center.creator)
  centersCreated: Center[];

  @OneToMany(() => EmailVerification, (verification) => verification.user)
  emailVerifications: EmailVerification[];

  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens: PasswordResetToken[];

  @OneToMany(() => UserProfile, (userProfile) => userProfile.user, {
    cascade: true,
  })
  userProfiles: UserProfile[];

  @OneToOne(() => UserInfo, (userInfo) => userInfo.user, {
    cascade: true,
    eager: true,
  })
  userInfo: UserInfo;
}
