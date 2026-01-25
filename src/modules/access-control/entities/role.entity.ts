import {
  Entity,
  Column,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProfileRole } from './profile-role.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { RolePermission } from './role-permission.entity';
import { SoftBaseEntity } from '@/shared/common/entities/soft-base.entity';

@Entity('roles')
@Index(['name', 'centerId'], { where: '"deletedAt" IS NULL', unique: true })
@Index(['name', 'createdAt']) // For alphabetical + chronological sorting
export class Role extends SoftBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  centerId?: string;

  @Column({ type: 'boolean', default: false })
  readOnly: boolean;

  // Relations
  @OneToMany(() => ProfileRole, (profileRole) => profileRole.role)
  profileRoles: ProfileRole[];

  @ManyToOne(() => Center, (center) => center.roles, { nullable: true })
  @JoinColumn({ name: 'centerId' })
  center?: Center;

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: RolePermission[];

  isSameScope(centerId?: string) {
    return !!this.centerId === !!centerId;
  }
}
