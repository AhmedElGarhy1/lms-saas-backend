import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Center } from '../../centers/entities/center.entity';

@Entity('user_on_centers')
export class UserOnCenter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  centerId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.centers)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Center, (center) => center.userCenters)
  @JoinColumn({ name: 'centerId' })
  center: Center;
}
