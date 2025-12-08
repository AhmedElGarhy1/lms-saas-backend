import { User } from '@/modules/user/entities/user.entity';
import {
  BeforeRemove,
  Column,
  DeleteDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { RequestContext } from '../context/request.context';
import { BaseEntity } from './base.entity';

export abstract class SoftBaseEntity extends BaseEntity {
  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  deletedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deletedBy' })
  deleter?: User;

  @BeforeRemove()
  protected setDeletedBy() {
    const ctx = RequestContext.get();
    const userId = ctx.userId; // Fallback to userId for backward compatibility
    if (userId) {
      this.deletedBy = userId;
      this.deletedAt = new Date();
    }
  }
}
