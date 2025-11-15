import { User } from '@/modules/user/entities/user.entity';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';
import { Staff } from '@/modules/staff/entities/staff.entity';
import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { Student } from '@/modules/students/entities/student.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export interface ProfileContext {
  role: Role | null;
  center?: Center | null;
}

export interface ProfileResponse extends User {
  context: ProfileContext;
  profileType: ProfileType;
  profile: Admin | Staff | Teacher | Student | null;
}

