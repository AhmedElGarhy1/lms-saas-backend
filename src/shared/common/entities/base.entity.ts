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
import { User } from '@/modules/user/entities/user.entity';

export abstract class BaseEntity extends BaseEntityTypeORM {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater?: User;

  @BeforeInsert()
  protected setCreatedBy() {
    const ctx = RequestContext.get();
    const userId = ctx.userId; // Fallback to userId for backward compatibility

    if (userId) {
      this.createdBy = userId;
      this.createdAt = new Date();
    }
  }

  @BeforeUpdate()
  protected setUpdatedBy() {
    const ctx = RequestContext.get();
    const userId = ctx.userId; // Fallback to userId for backward compatibility

    if (userId) {
      this.updatedBy = userId;
      this.updatedAt = new Date();
    }
  }
}
