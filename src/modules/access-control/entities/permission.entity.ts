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
import { ScopeType } from '@/shared/common/decorators/scope.decorator';

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

  @Column({ default: false })
  isAdmin: boolean;

  @Column({
    type: 'enum',
    enum: ScopeType,
    default: ScopeType.CENTER,
  })
  scope: ScopeType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @OneToMany(() => Center, (center) => center.id, { nullable: true })
  centerId: string | null;
}
