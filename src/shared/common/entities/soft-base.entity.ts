import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
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
  deletedByProfileId?: string;

  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'deletedByProfileId' })
  deleter?: UserProfile;

  @BeforeRemove()
  protected setDeletedBy() {
    const ctx = RequestContext.get();
    const userProfileId = ctx.userProfileId;
    if (userProfileId) {
      this.deletedByProfileId = userProfileId;
      this.deletedAt = new Date();
    }
  }
}
