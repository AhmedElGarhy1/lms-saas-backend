import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('user_access')
@Index(['granterUserId', 'targetUserId', 'centerId'], { unique: true })
export class UserAccess extends BaseEntity {
  @Column()
  targetUserId: string;

  @Column()
  granterUserId: string;

  @Column({ nullable: true })
  centerId: string;

  @ManyToOne(() => User, (user) => user.accessTarget)
  @JoinColumn({ name: 'targetUserId' })
  target: User;

  @ManyToOne(() => User, (user) => user.accessGranter)
  @JoinColumn({ name: 'granterUserId' })
  granter: User;

  @ManyToOne(() => Center, (center) => center.userAccess, {
    nullable: true,
  })
  @JoinColumn({ name: 'centerId' })
  center?: Center;
}
