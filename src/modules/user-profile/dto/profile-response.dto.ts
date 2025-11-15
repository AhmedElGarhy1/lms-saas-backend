import { ApiProperty } from '@nestjs/swagger';
import { User } from '@/modules/user/entities/user.entity';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';
import { Staff } from '@/modules/staff/entities/staff.entity';
import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { Student } from '@/modules/students/entities/student.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export class ProfileResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email?: string;

  @ApiProperty({
    description: 'User phone',
    example: '+1234567890',
  })
  phone?: string;

  @ApiProperty({
    description: 'User active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Failed login attempts',
    example: 0,
  })
  failedLoginAttempts: number;

  @ApiProperty({
    description: 'Two factor enabled',
    example: false,
  })
  twoFactorEnabled: boolean;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Created by user ID',
    example: 'uuid-string',
  })
  createdBy?: string;

  @ApiProperty({
    description: 'Updated by user ID',
    example: 'uuid-string',
  })
  updatedBy?: string;

  @ApiProperty({
    description: 'Deleted by user ID',
    example: 'uuid-string',
  })
  deletedBy?: string;

  @ApiProperty({
    description: 'Deletion date',
    example: '2023-01-15T10:30:00Z',
  })
  deletedAt?: Date;

  @ApiProperty({
    description: 'User role in current context',
    type: 'object',
    additionalProperties: true,
  })
  role?: Role | null;

  @ApiProperty({
    description: 'Center context',
    type: 'object',
    additionalProperties: true,
  })
  center?: Center | null;

  @ApiProperty({
    description: 'Profile type',
    enum: ProfileType,
    example: ProfileType.STAFF,
  })
  profileType: ProfileType;

  @ApiProperty({
    description: 'Profile-specific data (admin, staff, teacher, student)',
    oneOf: [
      { $ref: '#/components/schemas/Admin' },
      { $ref: '#/components/schemas/Staff' },
      { $ref: '#/components/schemas/Teacher' },
      { $ref: '#/components/schemas/Student' },
    ],
    required: false,
  })
  profile: Admin | Staff | Teacher | Student | null;
}
