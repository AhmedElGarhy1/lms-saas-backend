import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Role } from '../entities/role.entity';

export class DeletedRoleIdParamDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Role, 'id', true)
  roleId: string;
}
