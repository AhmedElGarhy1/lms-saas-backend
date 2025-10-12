import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('center_access')
@Index(['userId', 'centerId', 'global'], { unique: true })
@Index(['centerId'])
@Index(['global'])
export class CenterAccess extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  centerId: string;

  @Column({ type: 'boolean', default: false })
  global: boolean;

  // Relations
  @ManyToOne(() => User, (user) => user.centerAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Center, (center) => center.centerAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;
}
