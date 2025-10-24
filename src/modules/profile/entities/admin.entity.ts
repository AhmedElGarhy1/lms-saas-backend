import { Entity } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';

@Entity('admins')
export class Admin extends BaseEntity {}
