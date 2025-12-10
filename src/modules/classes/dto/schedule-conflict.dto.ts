import { ApiProperty } from '@nestjs/swagger';

export interface ConflictTimeRange {
  day: string;
  timeRange: string;
}

export interface TeacherConflictDto {
  teacherUserProfileId: string;
  teacherName: string;
  conflicts: ConflictTimeRange[];
}

export interface StudentConflictDto {
  studentUserProfileId: string;
  studentName: string;
  conflicts: ConflictTimeRange[];
}
