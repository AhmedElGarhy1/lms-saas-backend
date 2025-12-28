import { IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { Class } from '@/modules/classes/entities/class.entity';

export class PaginatePackagesDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by class ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToBranch(Class)
  classId?: string;
}
