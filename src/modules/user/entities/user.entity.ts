import { Entity, Column, OneToMany, OneToOne, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Center } from '@/modules/centers/entities/center.entity';
import { EmailVerification } from '@/modules/auth/entities/email-verification.entity';
import { PasswordResetToken } from '@/modules/auth/entities/password-reset-token.entity';
import { Profile } from '@/modules/user/entities/profile.entity';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { UserRole } from '@/modules/access-control/entities/user-role.entity';
import { CenterAccess } from '@/modules/access-control/entities/center-access.entity';
import { BranchAccess } from '@/modules/access-control/entities/branch-access.entity';
import { Locale } from '@/shared/common/enums/locale.enum';

@Entity('users')
@Index(['email'])
@Index(['phone'])
@Index(['locale'])
@Index(['isActive'])
export class User extends BaseEntity {
  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ unique: true, nullable: true })
  phone?: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lockoutUntil: Date;

  @Column({ nullable: true })
  @Exclude()
  twoFactorSecret: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: Locale, default: Locale.EN })
  locale: Locale;

  // Relations
  @OneToMany(() => Center, (center) => center.creator)
  centersCreated: Center[];

  @OneToMany(() => EmailVerification, (verification) => verification.user)
  emailVerifications: EmailVerification[];

  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens: PasswordResetToken[];

  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true })
  profile: Profile;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

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
