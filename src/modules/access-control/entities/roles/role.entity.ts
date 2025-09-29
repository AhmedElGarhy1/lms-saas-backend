import {
  Entity,
  Column,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserRole } from './user-role.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Center } from '@/modules/centers/entities/center.entity';

@Entity('roles')
@Index(['name', 'centerId'], { unique: true })
@Index(['type'])
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RoleType,
    default: RoleType.USER,
  })
  type: RoleType;

  @Column({ type: 'jsonb', nullable: true })
  permissions: string[];

  @Column({ type: 'uuid', nullable: true })
  centerId?: string;

  // Relations
  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];

  @ManyToOne(() => Center, (center) => center.roles, { nullable: true })
  @JoinColumn({ name: 'centerId' })
  center?: Center;
}
