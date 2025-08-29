import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { UserOnCenter } from '@/modules/access-control/entities/user-on-center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';

export enum CenterStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('centers')
@Index(['name'])
@Index(['status'])
export class Center extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CenterStatus,
    default: CenterStatus.ACTIVE,
  })
  status: CenterStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ type: 'int', default: 0 })
  currentEnrollment: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  // Relations
  @OneToMany(() => UserOnCenter, (userOnCenter) => userOnCenter.center)
  userCenters: UserOnCenter[];

  @OneToMany(() => UserAccess, (userAccess) => userAccess.center)
  userAccess: UserAccess[];

  // Note: AdminCenterAccess doesn't have a direct center relation
  // It's managed through the access-control service

  // Virtual properties for convenience
  get isCenterActive(): boolean {
    return this.status === CenterStatus.ACTIVE;
  }
}
