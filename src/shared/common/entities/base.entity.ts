import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  JoinColumn,
  ManyToOne,
  BeforeRemove,
  BeforeUpdate,
  BeforeInsert,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { RequestContext } from '../context/request.context';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  @Column({ type: 'uuid', nullable: true })
  deletedBy?: string;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deletedBy' })
  deleter?: User;

  // auto set createdBy, updatedBy, deletedBy
  @BeforeInsert()
  protected setCreatedBy() {
    const ctx = RequestContext.get();
    console.log('ctx?.userId', ctx?.userId);
    if (ctx.userId) {
      this.createdBy = ctx.userId;
    }
  }

  @BeforeUpdate()
  protected setUpdatedBy() {
    const ctx = RequestContext.get();
    if (ctx.userId) {
      this.updatedBy = ctx.userId;
    }
  }

  @BeforeRemove()
  protected setDeletedBy() {
    const ctx = RequestContext.get();
    if (ctx.userId) {
      this.deletedBy = ctx.userId;
    }
  }
}
