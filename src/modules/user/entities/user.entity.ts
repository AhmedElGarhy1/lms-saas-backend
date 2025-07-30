import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Profile } from './profile.entity';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { EmailVerification } from '@/modules/auth/entities/email-verification.entity';
import { PasswordResetToken } from '@/modules/auth/entities/password-reset-token.entity';
import { UserAccess } from './user-access.entity';
import { AdminCenterAccess } from '@/modules/access-control/entities/admin/admin-center-access.entity';
import { Center } from '@/modules/access-control/entities/center.entity';
import { UserOnCenter } from '@/modules/access-control/entities/user-on-center.entity';
import { UserRole } from '@/modules/access-control/entities/roles/user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lockoutUntil: Date;

  @Column({ nullable: true })
  twoFactorSecret: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  // Relations
  @OneToMany(() => AdminCenterAccess, (access) => access.admin)
  adminCenterAccessReceived: AdminCenterAccess[];

  @OneToMany(() => AdminCenterAccess, (access) => access.granter)
  adminCenterAccessGranted: AdminCenterAccess[];

  @OneToMany(() => Center, (center) => center.owner)
  centersOwned: Center[];

  @OneToMany(() => EmailVerification, (verification) => verification.user)
  emailVerifications: EmailVerification[];

  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens: PasswordResetToken[];

  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true })
  @JoinColumn()
  profile: Profile;

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
