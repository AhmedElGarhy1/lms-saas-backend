import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../user/entities/user.entity';

@Entity('admin_center_access')
export class AdminCenterAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  adminUserId: string;

  @Column()
  granterUserId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.adminCenterAccessReceived)
  @JoinColumn({ name: 'adminUserId' })
  admin: User;

  @ManyToOne(() => User, (user) => user.adminCenterAccessGranted)
  @JoinColumn({ name: 'granterUserId' })
  granter: User;
}
