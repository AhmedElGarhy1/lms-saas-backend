import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { Role } from '@/modules/access-control/entities/roles/role.entity';
import { Center } from '@/modules/centers/entities/center.entity';

export class AssignRoleDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  @Exists(User)
  userId: string;

  @ApiProperty({ description: 'Role ID' })
  @IsUUID()
  @Exists(Role)
  roleId: string;

  @ApiProperty({ description: 'Center ID', required: false })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string;
}
