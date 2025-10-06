import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Role } from './role.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Center } from '@/modules/centers/entities/center.entity';

@Entity('user_roles')
@Index(['userId', 'centerId', 'roleId'], { unique: true })
@Index(['centerId'])
export class UserRole extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @Column({ type: 'uuid', nullable: true })
  centerId: string;

  @ManyToOne(() => User, (user) => user.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Role, (role) => role.userRoles)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne(() => Center, (center) => center.userRoles)
  @JoinColumn({ name: 'centerId' })
  center: Center;
}
