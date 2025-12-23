import { Entity, Column, OneToMany, Index } from 'typeorm';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { Role } from '@/modules/access-control/entities/role.entity';
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { CenterAccess } from '@/modules/access-control/entities/center-access.entity';
import { Branch } from './branch.entity';
import { BranchAccess } from './branch-access.entity';
import { Level } from '@/modules/levels/entities/level.entity';
import { Subject } from '@/modules/subjects/entities/subject.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { Group } from '@/modules/classes/entities/group.entity';
import { SoftBaseEntity } from '@/shared/common/entities/soft-base.entity';

@Entity('centers')
@Index(['name'])
@Index(['email'], { where: 'email IS NOT NULL', unique: true })
@Index(['phone'], { where: 'phone IS NOT NULL', unique: true })
export class Center extends SoftBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 50, default: 'Africa/Cairo' })
  timezone: string;

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

  @OneToMany(() => Level, (level) => level.center)
  levels: Level[];

  @OneToMany(() => Subject, (subject) => subject.center)
  subjects: Subject[];

  @OneToMany(() => Class, (classEntity) => classEntity.center)
  classes: Class[];

  @OneToMany(() => Group, (group) => group.center)
  groups: Group[];
}
