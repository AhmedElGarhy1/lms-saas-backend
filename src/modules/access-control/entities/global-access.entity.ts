import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('global_access')
@Index(['userId', 'centerId'], { unique: true })
@Index(['centerId'])
export class GlobalAccess extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  centerId: string;

  // Relations
  @ManyToOne(() => User, (user) => user.globalAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Center, (center) => center.globalAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'centerId' })
  center: Center;
}
