import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, Validate } from 'class-validator';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '@/modules/access-control/entities/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';

export class CreateStaffDto extends CreateUserDto {
  @ApiProperty({
    description: 'Role ID for the staff member (requires centerId)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Role)
  @Validate(
    (object: CreateStaffDto, value: any) => {
      // If roleId is provided, centerId must also be provided
      return !value || object.centerId;
    },
    {
      message: 'roleId can only be provided when centerId is also provided',
    },
  )
  roleId?: string;

  @ApiProperty({
    description: 'Center ID for the staff member',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string;
}
