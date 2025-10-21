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
} from 'typeorm';
import { User } from './user.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

@Entity('user_profiles')
@Index(['userId'])
@Index(['profileType'])
@Index(['userId', 'profileType'])
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ProfileType })
  profileType: ProfileType;

  @Column()
  profileRefId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => User, (user) => user.userProfiles)
  @JoinColumn({ name: 'userId' })
  user: User;
}
