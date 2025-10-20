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
import { User } from '@/modules/user/entities/user.entity';
import { Branch } from '../../centers/entities/branch.entity';
import { Center } from '../../centers/entities/center.entity';

@Entity('branch_access')
@Index(['userId', 'branchId'], { unique: true })
@Index(['userId'])
@Index(['branchId'])
@Index(['centerId'])
export class BranchAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  branchId: string;

  @Column({ type: 'uuid', nullable: true })
  centerId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.branchAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Branch, (branch) => branch.branchAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => Center, (center) => center.branchAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;
}
