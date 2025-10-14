import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { PermissionScope } from '@/modules/access-control/constants/permissions';

@Entity('role_permissions')
@Index(['userId', 'roleId', 'permissionId'], { unique: true })
@Index(['userId'])
@Index(['roleId'])
@Index(['permissionId'])
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @Column({ type: 'uuid' })
  permissionId: string;

  @Column({
    type: 'enum',
    enum: PermissionScope,
    default: PermissionScope.CENTER,
  })
  permissionScope: PermissionScope;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// TODO: validation for permissionScope and permission
