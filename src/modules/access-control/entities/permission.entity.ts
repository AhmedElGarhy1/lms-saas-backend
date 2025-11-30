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
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  group: string;

  @Column({
    type: 'varchar',
    length: 20,
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

  // Translation happens in TranslationResponseInterceptor
  // Entities store translation keys as-is (e.g., name: 't.permissions.users.create')
}
