import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, Validate } from 'class-validator';
import { PaginateUsersDto } from '@/modules/user/dto/paginate-users.dto';
import { Transform } from 'class-transformer';

export class PaginateStaffDto extends PaginateUsersDto {
  @ApiPropertyOptional({
    description: 'Display role in case of centerId provided',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @Validate(
    (object: PaginateStaffDto, value: any) => {
      return !value || object.centerId;
    },
    {
      message:
        'displayRole can only be provided when centerId is also provided',
    },
  )
  displayRole?: boolean;
}
