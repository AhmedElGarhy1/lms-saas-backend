import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { UserRole } from '@/modules/access-control/entities/user-role.entity';

@Entity('user_profiles')
@Index(['userId'])
@Index(['profileType'])
@Index(['userId', 'profileType'])
export class UserProfile extends BaseEntity {
  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ProfileType })
  profileType: ProfileType;

  @Column()
  profileRefId: string;

  @ManyToOne(() => User, (user) => user.userProfiles)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => UserRole, (userRole) => userRole.profile)
  userRoles: UserRole[];
}
