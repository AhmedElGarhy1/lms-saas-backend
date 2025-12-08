import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { CenterAccess } from '@/modules/access-control/entities/center-access.entity';
import { BranchAccess } from '@/modules/access-control/entities/branch-access.entity';
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { GroupStudent } from '@/modules/classes/entities/group-student.entity';
import { SoftBaseEntity } from '@/shared/common/entities/soft-base.entity';

@Entity('user_profiles')
@Index(['userId'])
@Index(['profileType'])
@Index(['userId', 'profileType'])
export class UserProfile extends SoftBaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  profileType: ProfileType;

  @Column({ type: 'uuid' })
  profileRefId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => User, (user) => user.userProfiles)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => UserAccess, (userAccess) => userAccess.target)
  accessTarget: UserAccess[];

  @OneToMany(() => UserAccess, (userAccess) => userAccess.granter)
  accessGranter: UserAccess[];

  @OneToMany(() => CenterAccess, (centerAccess) => centerAccess.profile)
  centerAccess: CenterAccess[];

  @OneToMany(() => BranchAccess, (branchAccess) => branchAccess.profile)
  branchAccess: BranchAccess[];

  @OneToMany(() => ProfileRole, (profileRole) => profileRole.userProfile)
  profileRoles: ProfileRole[];

  @OneToMany(() => Class, (classEntity) => classEntity.teacher)
  classesAsTeacher: Class[];

  @OneToMany(() => GroupStudent, (groupStudent) => groupStudent.student)
  groupStudents: GroupStudent[];
}
