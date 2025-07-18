import { Student } from '@prisma/client';

export type StudentWithRelations = Student & {
  centerId?: string | null;
  teacherId?: string | null;
  userId: string;
  // Add more relations as needed
};
