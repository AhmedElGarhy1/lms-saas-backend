import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Admin } from '../entities/admin.entity';
import { Staff } from '../entities/staff.entity';
import { Student } from '@/modules/students/entities/student.entity';
import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { Role } from '@/modules/access-control/entities/role.entity';

export interface ProfileResponse {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  userInfo: {
    address?: string;
    dateOfBirth?: Date;
    locale: string;
  };
  context: {
    center?: Center | null;
    role: Role;
  };
  profileType: ProfileType;
  profile: Admin | Staff | Student | Teacher; // TODO: add parent
}
