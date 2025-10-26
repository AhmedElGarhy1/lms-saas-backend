import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class UserInfoResponseDto {
  @ApiProperty({ description: 'User info ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User address', required: false })
  @Expose()
  address?: string;

  @ApiProperty({ description: 'User date of birth', required: false })
  @Expose()
  @Type(() => Date)
  dateOfBirth?: Date;

  @ApiProperty({ description: 'User locale' })
  @Expose()
  locale: string;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}

export class StaffProfileDto {
  @ApiProperty({ description: 'Staff ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}

export class TeacherProfileDto {
  @ApiProperty({ description: 'Teacher ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Teacher ID', required: false })
  @Expose()
  teacherId?: string;

  @ApiProperty({ description: 'Department', required: false })
  @Expose()
  department?: string;

  @ApiProperty({ description: 'Subject', required: false })
  @Expose()
  subject?: string;

  @ApiProperty({ description: 'Hire date', required: false })
  @Expose()
  @Type(() => Date)
  hireDate?: Date;

  @ApiProperty({ description: 'Salary', required: false })
  @Expose()
  salary?: number;

  @ApiProperty({ description: 'Status' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Bio', required: false })
  @Expose()
  bio?: string;

  @ApiProperty({ description: 'Qualifications', required: false })
  @Expose()
  qualifications?: string;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}

export class StudentProfileDto {
  @ApiProperty({ description: 'Student ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Student ID', required: false })
  @Expose()
  studentId?: string;

  @ApiProperty({ description: 'Grade', required: false })
  @Expose()
  grade?: string;

  @ApiProperty({ description: 'Class', required: false })
  @Expose()
  class?: string;

  @ApiProperty({ description: 'Enrollment date', required: false })
  @Expose()
  @Type(() => Date)
  enrollmentDate?: Date;

  @ApiProperty({ description: 'Graduation date', required: false })
  @Expose()
  @Type(() => Date)
  graduationDate?: Date;

  @ApiProperty({ description: 'Status' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Notes', required: false })
  @Expose()
  notes?: string;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}

export class ParentProfileDto {
  @ApiProperty({ description: 'Parent ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}

export class UserProfileResponseDto {
  @ApiProperty({ description: 'User ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User email' })
  @Expose()
  email?: string;

  @ApiProperty({ description: 'User phone' })
  @Expose()
  phone?: string;

  @ApiProperty({ description: 'User name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Whether the user is active' })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Two-factor authentication enabled' })
  @Expose()
  twoFactorEnabled: boolean;

  @ApiProperty({ description: 'Failed login attempts' })
  @Expose()
  failedLoginAttempts: number;

  @ApiProperty({ description: 'Lockout until date', required: false })
  @Expose()
  @Type(() => Date)
  lockoutUntil?: Date;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;

  @ApiProperty({ description: 'User info', type: UserInfoResponseDto })
  @Expose()
  @Type(() => UserInfoResponseDto)
  userInfo: UserInfoResponseDto;

  @ApiProperty({ description: 'User profiles', type: [Object] })
  @Expose()
  profiles: Array<{
    type: 'Staff' | 'Teacher' | 'Student' | 'Parent';
    data:
      | StaffProfileDto
      | TeacherProfileDto
      | StudentProfileDto
      | ParentProfileDto;
  }>;
}
