import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Entity } from 'typeorm';

@Entity('staff')
export class Staff extends BaseEntity {
  // Staff-specific fields can be added here as needed
}
