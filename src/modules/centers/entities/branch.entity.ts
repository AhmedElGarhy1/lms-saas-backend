import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Center } from './center.entity';
import { BranchAccess } from '../../access-control/entities/branch-access.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { Group } from '@/modules/classes/entities/group.entity';

@Entity('branches')
@Index(['centerId'])
@Index(['isActive'])
@Index(['location'])
@Index(['centerId', 'isActive'])
export class Branch extends BaseEntity {
  @Column({ type: 'uuid' })
  centerId: string;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  // Relations
  @ManyToOne(() => Center, (center) => center.branches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @OneToMany(() => BranchAccess, (access) => access.branch)
  branchAccess: BranchAccess[];

  @OneToMany(() => Class, (classEntity) => classEntity.branch)
  classes: Class[];

  @OneToMany(() => Group, (group) => group.branch)
  groups: Group[];
}
