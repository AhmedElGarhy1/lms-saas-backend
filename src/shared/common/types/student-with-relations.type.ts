import { User } from 'src/modules/user/entities/user.entity';
import { UserInfo } from 'src/modules/user/entities/user-info.entity';
import { UserProfile } from 'src/modules/user/entities/user-profile.entity';
import { Student } from 'src/modules/students/entities/student.entity';

export type StudentWithRelations = User & {
  userInfo: UserInfo;
  userProfiles: UserProfile[];
  student: Student & {
    grade: string;
    gradeLevel: string;
    groupId?: string;
    teacherId?: string;
    centerId?: string;
  };
  // Add more relations as needed
};
