import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { Center } from '@/modules/centers/entities/center.entity';

export class PaginateRolesDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by user accessible',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  @Exists(User)
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by center accessible',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  @Exists(Center)
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by type accessible',
    enum: [RoleType.ADMIN, RoleType.SYSTEM],
  })
  @IsOptional()
  @IsEnum([RoleType.ADMIN, RoleType.SYSTEM])
  type?: RoleType;
}
