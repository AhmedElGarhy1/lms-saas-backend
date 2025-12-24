import {
  Entity,
  Column,
  OneToMany,
  OneToOne,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { VerificationToken } from '@/modules/auth/entities/verification-token.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { UserInfo } from './user-info.entity';
import { SoftBaseEntity } from '@/shared/common/entities/soft-base.entity';

@Entity('users')
@Index(['phone'], { unique: true })
@Index(['isActive'])
export class User extends SoftBaseEntity {
  @Column({ type: 'varchar', length: 12, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, select: false })
  @Exclude()
  password: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  @Exclude()
  hashedRt: string | null;

  
  @Column({ type: 'timestamptz', nullable: true })
  phoneVerified: Date | null;

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

  /**
   * Hash password before inserting new user
   */
  @BeforeInsert()
  async hashPasswordBeforeInsert() {
    if (this.password && !this.isPasswordHashed(this.password)) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  /**
   * Hash password before updating if password has changed
   */
  @BeforeUpdate()
  async hashPasswordBeforeUpdate() {
    if (this.password && !this.isPasswordHashed(this.password)) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  /**
   * Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
   */
  private isPasswordHashed(password: string): boolean {
    return /^\$2[ayb]\$.{56}$/.test(password);
  }

  getPhone(): string {
    return `+2${this.phone}`;
  }
}
