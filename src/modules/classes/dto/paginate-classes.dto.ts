import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { ClassStatus } from '../enums/class-status.enum';

export class PaginateClassesDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by branch ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToCenter(Branch)
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

  @ApiProperty({
    description: 'Filter by class status',
    enum: ClassStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;
}
