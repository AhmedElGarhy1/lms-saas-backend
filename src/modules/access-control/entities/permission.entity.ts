import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Center } from '../../centers/entities/center.entity';
import { PermissionScope } from '@/modules/access-control/constants/permissions';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PermissionScope,
    default: PermissionScope.CENTER,
  })
  scope: PermissionScope;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @OneToMany(() => Center, (center) => center.id, { nullable: true })
  centerId: string | null;
}
