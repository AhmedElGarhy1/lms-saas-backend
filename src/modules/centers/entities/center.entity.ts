import { Entity, Column, OneToMany, Index } from 'typeorm';

import { BaseEntity } from '@/shared/common/entities/base.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { Role } from '@/modules/access-control/entities/roles/role.entity';
import { UserRole } from '@/modules/access-control/entities/roles/user-role.entity';
import { CenterAccess } from '@/modules/access-control/entities/center-access.entity';

@Entity('centers')
@Index(['name'])
export class Center extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relations

  @OneToMany(() => UserAccess, (userAccess) => userAccess.center)
  userAccess: UserAccess[];

  @OneToMany(() => Role, (role) => role.center)
  roles: Role[];

  @OneToMany(() => UserRole, (userRole) => userRole.center)
  userRoles: UserRole[];

  @OneToMany(() => CenterAccess, (centerAccess) => centerAccess.center)
  centerAccess: CenterAccess[];
}
