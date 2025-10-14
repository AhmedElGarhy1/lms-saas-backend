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
import { UserRole } from './user-role.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { Center } from '@/modules/centers/entities/center.entity';
import { BadRequestException } from '@nestjs/common';
import { RolePermissionDto } from '../../dto/role-permission.dto';
import { RolePermission } from '../role-permission.entity';

@Entity('roles')
@Index(['name', 'centerId'], { unique: true })
@Index(['type'])
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RoleType,
    default: RoleType.CENTER,
  })
  type: RoleType;

  @Column({ type: 'uuid', nullable: true })
  centerId?: string;

  @Column({ type: 'boolean', default: false })
  readOnly: boolean;

  // Relations
  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];

  @ManyToOne(() => Center, (center) => center.roles, { nullable: true })
  @JoinColumn({ name: 'centerId' })
  center?: Center;

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: RolePermission[];

  @BeforeInsert()
  @BeforeUpdate()
  validateRoleType() {
    // CENTER roles must have a centerId
    if (this.type === RoleType.CENTER && !this.centerId) {
      throw new BadRequestException(
        'CENTER roles must be associated with a center',
      );
    }

    // ADMIN and SYSTEM roles cannot have a centerId
    if (
      (this.type === RoleType.ADMIN || this.type === RoleType.SYSTEM) &&
      this.centerId
    ) {
      throw new BadRequestException(
        'ADMIN and SYSTEM roles cannot be associated with a center',
      );
    }
  }

  isSameScope(centerId?: string) {
    return !!this.centerId === !!centerId;
  }
}
