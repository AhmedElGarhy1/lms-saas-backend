import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_info')
@Index(['userId'])
export class UserInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  dateOfBirth?: Date;

  @Column({ type: 'enum', enum: ['en', 'ar'], default: 'en' })
  locale: 'en' | 'ar';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToOne(() => User, (user) => user.userInfo)
  @JoinColumn({ name: 'userId' })
  user: User;
}
