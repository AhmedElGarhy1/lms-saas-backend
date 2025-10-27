import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Entity } from 'typeorm';

@Entity('admins')
export class Admin extends BaseEntity {
  // Admin-specific fields can be added here as needed
}
