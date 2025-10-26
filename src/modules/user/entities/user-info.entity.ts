import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Locale } from '@/shared/common/enums/locale.enum';

@Entity('user_info')
@Index(['userId'])
export class UserInfo extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  dateOfBirth?: Date;

  @Column({ type: 'enum', enum: Locale, default: Locale.AR })
  locale: Locale;

  @OneToOne(() => User, (user) => user.userInfo)
  @JoinColumn({ name: 'userId' })
  user: User;
}
