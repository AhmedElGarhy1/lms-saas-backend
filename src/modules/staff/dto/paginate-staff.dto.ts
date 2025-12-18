import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginateManagerUsersDto } from '@/modules/user/dto/paginate-manager-users.dto';
import { AccessibleUsersEnum } from '@/modules/user/dto/paginate-manager-users.dto';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Class } from '@/modules/classes/entities/class.entity';

export class PaginateStaffDto extends PaginateManagerUsersDto {
  @ApiPropertyOptional({
    description: 'Filter by class ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Class)
  classId?: string;

  @ApiPropertyOptional({
    description: 'Filter by class access',
    enum: AccessibleUsersEnum,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  classAccess?: AccessibleUsersEnum;
}
