import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';
import { Staff } from '@/modules/staff/entities/staff.entity';
import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { Student } from '@/modules/students/entities/student.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export class UserProfileMeResponseDto {
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
