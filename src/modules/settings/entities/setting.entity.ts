import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { SettingType } from '../enums/setting-type.enum';

@Entity('settings')
@Index(['key'], { unique: true })
export class Setting extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: SettingType.STRING,
  })
  type: SettingType;

  @Column({ type: 'text', nullable: true })
  description?: string;
}
