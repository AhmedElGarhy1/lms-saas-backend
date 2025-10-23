import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

@Entity('center_access')
@Index(['userId', 'centerId', 'profileType'], { unique: true })
@Index(['centerId'])
@Index(['profileType'])
export class CenterAccess extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  centerId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: ProfileType })
  profileType: ProfileType;

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
