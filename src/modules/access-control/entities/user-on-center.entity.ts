import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Center } from '../../centers/entities/center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('user_on_centers')
export class UserOnCenter extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  centerId: string;

  @ManyToOne(() => User, (user) => user.centers)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Center, (center) => center.userCenters)
  @JoinColumn({ name: 'centerId' })
  center: Center;
}
