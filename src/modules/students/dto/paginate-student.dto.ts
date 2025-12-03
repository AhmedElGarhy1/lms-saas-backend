import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { PaginateUsersDto } from '@/modules/user/dto/paginate-users.dto';
import { Transform } from 'class-transformer';

export class PaginateStudentDto extends PaginateUsersDto {
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
  displayDetailes?: boolean;
}

