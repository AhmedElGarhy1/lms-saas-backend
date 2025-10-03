import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Center } from '../../centers/entities/center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('user_centers')
export class UserCenter extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  centerId: string;

  @ManyToOne(() => User, (user) => user.centerAccess)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Center, (center) => center.userCenters)
  @JoinColumn({ name: 'centerId' })
  center: Center;
}
