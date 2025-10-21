import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity('teachers')
@Index(['teacherId'])
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  teacherId?: string;

  @Column({ nullable: true })
  department?: string;

  @Column({ nullable: true })
  subject?: string;

  @Column({ nullable: true })
  hireDate?: Date;

  @Column({ nullable: true })
  salary?: number;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'text', nullable: true })
  qualifications?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
