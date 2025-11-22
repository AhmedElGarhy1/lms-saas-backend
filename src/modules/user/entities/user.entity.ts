import { Entity, Column, OneToMany, OneToOne, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { VerificationToken } from '@/modules/auth/entities/verification-token.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
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

  @Column({ type: 'timestamp', nullable: true })
  phoneVerified: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerified: Date | null;

  @OneToMany(() => VerificationToken, (token) => token.user)
  verificationTokens: VerificationToken[];

  @OneToMany(() => UserProfile, (userProfile) => userProfile.user, {
    cascade: true,
  })
  userProfiles: UserProfile[];

  @OneToOne(() => UserInfo, (userInfo) => userInfo.user, {
    cascade: true,
    eager: true,
  })
  userInfo: UserInfo;

  getPhone(): string {
    return `+2${this.phone}`;
  }
}
