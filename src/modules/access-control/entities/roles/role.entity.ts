import { Entity, Column, OneToMany, Index } from 'typeorm';
import { UserRole } from './user-role.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';

@Entity('roles')
@Index(['name'])
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

  @Column({ type: 'int', default: 0 })
  priority: number;

  // Relations
  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];
}
