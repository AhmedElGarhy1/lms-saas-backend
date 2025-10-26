import {
  Entity,
  Column,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ProfileRole } from './profile-role.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { BadRequestException } from '@nestjs/common';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
@Index(['name', 'centerId'], { unique: true })
export class Role extends BaseEntity {
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

  @BeforeInsert()
  @BeforeUpdate()
  isSameScope(centerId?: string) {
    return !!this.centerId === !!centerId;
  }
}
