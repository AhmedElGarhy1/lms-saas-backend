import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  ManyToOne,
  BeforeUpdate,
  BeforeInsert,
} from 'typeorm';
import { RequestContext } from '../context/request.context';
import { BaseEntity as BaseEntityTypeORM } from 'typeorm';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

export abstract class BaseEntity extends BaseEntityTypeORM {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'uuid' })
  createdByProfileId: string;

  @Column({ type: 'uuid', nullable: true })
  updatedByProfileId?: string;

  // Relations
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'createdByProfileId' })
  creator: UserProfile;

  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'updatedByProfileId' })
  updater?: UserProfile;

  @BeforeInsert()
  protected setCreatedBy() {
    const ctx = RequestContext.get();
    const userProfileId = ctx.userProfileId;
    console.log('setCreatedBy userProfileId', userProfileId)
    if (userProfileId) {
      this.createdByProfileId = userProfileId;
      this.createdAt = new Date();
    }
  }

  @BeforeUpdate()
  protected setUpdatedBy() {
    const ctx = RequestContext.get();
    const userProfileId = ctx.userProfileId;
    console.log('setUpdatedBy userProfileId', userProfileId)

    if (userProfileId) {
      this.updatedByProfileId = userProfileId;
      this.updatedAt = new Date();
    }
  }
}
