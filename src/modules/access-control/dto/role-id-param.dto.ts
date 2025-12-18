import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '../entities/role.entity';

export class RoleIdParamDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Role)
  roleId: string;
}
