import { User } from 'src/modules/user/entities/user.entity';
import { Profile } from 'src/modules/user/entities/profile.entity';

export type StudentWithRelations = User & {
  profile: Profile & {
    student: {
      grade: string;
      gradeLevel: string;
      groupId?: string;
      teacherId?: string;
      centerId?: string;
    };
  };
  // Add more relations as needed
};
