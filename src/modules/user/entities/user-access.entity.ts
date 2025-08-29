import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Center } from '@/modules/centers/entities/center.entity';

@Entity('user_access')
@Index(['granterUserId', 'targetUserId', 'centerId'], { unique: true })
export class UserAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  targetUserId: string;

  @Column()
  granterUserId: string;

  @Column({ nullable: true })
  centerId: string;

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

  @ManyToOne(() => Center, (center) => center.userAccess, { nullable: true })
  @JoinColumn({ name: 'centerId' })
  center?: Center;
}
