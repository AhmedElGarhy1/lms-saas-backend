import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';

export class PaginateClassesDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by branch ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  branchId?: string;

  @ApiProperty({
    description: 'Filter by level ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  levelId?: string;

  @ApiProperty({
    description: 'Filter by subject ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  subjectId?: string;

  @ApiProperty({
    description: 'Filter by teacher user profile ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  teacherUserProfileId?: string;
}
