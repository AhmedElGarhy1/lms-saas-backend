import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  Validate,
} from 'class-validator';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '@/modules/access-control/entities/role.entity';

export class CreateAdminDto extends CreateUserDto {
  @ApiProperty({
    description: 'Role ID for the admin (global role, no center required)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Role)
  roleId?: string;

  @Validate(
    (object: CreateAdminDto, value: any) => {
      // Admin should not have centerId
      return !value;
    },
    {
      message: 'Admin cannot be assigned to a specific center',
    },
  )
  centerId?: never; // This property should never exist for admin
}
