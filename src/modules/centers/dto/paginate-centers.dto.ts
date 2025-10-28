import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { AccessibleUsersEnum } from '@/modules/user/dto/paginate-users.dto';
import { Transform } from 'class-transformer';

export class PaginateCentersDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by center name',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  userProfileId?: string;

  @ApiPropertyOptional({
    description: 'Filter by center access',
    enum: AccessibleUsersEnum,
    example: AccessibleUsersEnum.INCLUDE,
  })
  @IsOptional()
  @IsEnum(AccessibleUsersEnum)
  centerAccess?: AccessibleUsersEnum;
}
