import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_access')
export class UserAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  targetUserId: string;

  @Column()
  granterUserId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.accessTarget)
  @JoinColumn({ name: 'targetUserId' })
  target: User;

  @ManyToOne(() => User, (user) => user.accessGranter)
  @JoinColumn({ name: 'granterUserId' })
  granter: User;
}
