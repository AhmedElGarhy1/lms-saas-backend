import { Entity, Column, OneToMany, OneToOne, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Center } from '@/modules/centers/entities/center.entity';
import { EmailVerification } from '@/modules/auth/entities/email-verification.entity';
import { PasswordResetToken } from '@/modules/auth/entities/password-reset-token.entity';
import { UserInfo } from '@/modules/user/entities/user-info.entity';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { UserRole } from '@/modules/access-control/entities/user-role.entity';
import { CenterAccess } from '@/modules/access-control/entities/center-access.entity';
import { BranchAccess } from '@/modules/access-control/entities/branch-access.entity';
// Locale enum removed - now handled in UserInfo entity

@Entity('users')
@Index(['email'])
@Index(['phone'])
// Locale index removed - now in UserInfo entity
@Index(['isActive'])
export class User extends BaseEntity {
  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ unique: true, nullable: true })
  phone?: string;

  @Column({ select: false })
  @Exclude()
  password: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lockoutUntil: Date;

  @Column({ nullable: true, select: false })
  @Exclude()
  twoFactorSecret: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  @Exclude()
  hashedRt: string | null;

  // Locale moved to UserInfo entity to avoid duplication

  // Relations
  @OneToMany(() => Center, (center) => center.creator)
  centersCreated: Center[];

  @OneToMany(() => EmailVerification, (verification) => verification.user)
  emailVerifications: EmailVerification[];

  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens: PasswordResetToken[];

  @OneToOne(() => UserInfo, (userInfo) => userInfo.user, {
    cascade: true,
    eager: true,
  })
  userInfo: UserInfo;

  @OneToMany(() => UserProfile, (userProfile) => userProfile.user, {
    cascade: true,
  })
  userProfiles: UserProfile[];

  @OneToMany(() => UserAccess, (access) => access.target)
  accessTarget: UserAccess[];

  @OneToMany(() => UserAccess, (access) => access.granter)
  accessGranter: UserAccess[];

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @OneToMany(() => CenterAccess, (centerAccess) => centerAccess.user)
  centerAccess: CenterAccess[];

  @OneToMany(() => BranchAccess, (branchAccess) => branchAccess.user)
  branchAccess: BranchAccess[];
}
