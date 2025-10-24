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
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';
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
    description: 'Filter by center active status',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true') return true;
      if (lowerValue === 'false') return false;
      return undefined; // Invalid string value
    }
    if (typeof value === 'boolean') {
      return value; // Already a boolean
    }
    return undefined; // Not a string or boolean
  })
  isActive?: boolean;

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
