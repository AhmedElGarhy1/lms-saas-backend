import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { ClassPackage } from './class-package.entity';

export enum StudentPackageStatus {
  ACTIVE = 'ACTIVE',
  EXHAUSTED = 'EXHAUSTED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
}

@Entity('student_packages')
@Index(['studentProfileId'])
@Index(['packageId'])
@Index(['status'])
@Index(['expiresAt'])
@Index(['studentProfileId', 'status'])
export class StudentPackage extends BaseEntity {
  @Column({ type: 'uuid' })
  studentProfileId: string;

  @Column({ type: 'uuid' })
  packageId: string;

  @Column({ type: 'int4' })
  remainingSessions: number;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: StudentPackageStatus.ACTIVE,
  })
  status: StudentPackageStatus;

  // Relations
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentProfileId' })
  student: UserProfile;

  @ManyToOne(() => ClassPackage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'packageId' })
  package: ClassPackage;
}

