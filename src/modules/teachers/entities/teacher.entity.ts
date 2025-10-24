import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Entity } from 'typeorm';

@Entity('teachers')
export class Teacher extends BaseEntity {}
