import { Entity, Column, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Center } from '@/modules/centers/entities/center.entity';
import { EmailVerification } from '@/modules/auth/entities/email-verification.entity';
import { PasswordResetToken } from '@/modules/auth/entities/password-reset-token.entity';
import { Profile } from '@/modules/user/entities/profile.entity';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { UserOnCenter } from '@/modules/access-control/entities/user-on-center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { UserRole } from '@/modules/access-control/entities/roles/user-role.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

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

  @Column({ nullable: true })
  profileId?: string;

  // Relations
  @OneToMany(() => Center, (center) => center.creator)
  centersCreated: Center[];

  @OneToMany(() => EmailVerification, (verification) => verification.user)
  emailVerifications: EmailVerification[];

  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens: PasswordResetToken[];

  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true })
  @JoinColumn({ name: 'profileId' })
  profile?: Profile;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => UserAccess, (access) => access.target)
  accessTarget: UserAccess[];

  @OneToMany(() => UserAccess, (access) => access.granter)
  accessGranter: UserAccess[];

  @OneToMany(() => UserOnCenter, (userCenter) => userCenter.user)
  centers: UserOnCenter[];

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];
}
