import { Entity, Column, OneToMany, Index } from 'typeorm';

import { BaseEntity } from '@/shared/common/entities/base.entity';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { Role } from '@/modules/access-control/entities/role.entity';
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { CenterAccess } from '@/modules/access-control/entities/center-access.entity';
import { Branch } from './branch.entity';
import { BranchAccess } from '../../access-control/entities/branch-access.entity';

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

  @OneToMany(() => ProfileRole, (profileRole) => profileRole.center)
  profileRoles: ProfileRole[];

  @OneToMany(() => CenterAccess, (centerAccess) => centerAccess.center)
  centerAccess: CenterAccess[];

  @OneToMany(() => Branch, (branch) => branch.center)
  branches: Branch[];

  @OneToMany(() => BranchAccess, (branchAccess) => branchAccess.center)
  branchAccess: BranchAccess[];
}
