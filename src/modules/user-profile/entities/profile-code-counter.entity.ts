import {
  Entity,
  Column,
  Index,
  BaseEntity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('profile_code_counters')
@Index(['rolePrefix', 'yearYY'], { unique: true })
export class ProfileCodeCounter extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 3 })
  rolePrefix: string;

  @Column({ type: 'varchar', length: 2 })
  yearYY: string;

  @Column({ type: 'int', default: 0 })
  currentValue: number;
}
