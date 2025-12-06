import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  Validate,
  ValidateIf,
} from 'class-validator';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';

export class CreateUserProfileDto extends CreateUserDto {
  @ApiProperty({
    description: 'Profile type (STAFF, ADMIN, TEACHER, STUDENT, PARENT)',
    enum: ProfileType,
  })
  @IsEnum(ProfileType)
  profileType: ProfileType;

  @ApiProperty({
    description:
      'Center ID for the profile (required for STAFF/TEACHER, not allowed for ADMIN)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  @ValidateIf((o: CreateUserProfileDto) => o.profileType !== ProfileType.ADMIN)
  @Validate(
    (object: CreateUserProfileDto, value: string) => {
      // If profileType is STAFF or TEACHER, centerId can be provided
      // If profileType is ADMIN, centerId should not be provided
      if (object.profileType === ProfileType.ADMIN) {
        return !value;
      }
      return true;
    },
    {
      message: 'Admin cannot be assigned to a specific center',
    },
  )
  centerId?: string;

  @ApiProperty({
    description: 'Role ID for the profile (optional)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Role)
  @Validate(
    (object: CreateUserProfileDto, value: any) => {
      // If roleId is provided and profileType is STAFF/TEACHER, centerId must also be provided
      if (
        value &&
        (object.profileType === ProfileType.STAFF ||
          object.profileType === ProfileType.TEACHER)
      ) {
        return !!object.centerId;
      }
      // For ADMIN, roleId can be provided without centerId (global role)
      return true;
    },
    {
      message:
        'roleId can only be provided when centerId is also provided for STAFF/TEACHER profiles',
    },
  )
  roleId?: string;
}
