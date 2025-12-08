import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  BaseEntity,
} from 'typeorm';
import { Center } from '../../centers/entities/center.entity';
import { PermissionScope } from '@/modules/access-control/constants/permissions';

@Entity('permissions')
export class Permission extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  group: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: PermissionScope.CENTER,
  })
  scope: PermissionScope;

  @OneToMany(() => Center, (center) => center.id, { nullable: true })
  centerId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
