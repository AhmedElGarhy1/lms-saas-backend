import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { Branch } from '@/modules/centers/entities/branch.entity';

export class PaginateCashboxesDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by branch ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToCenter(Branch)
  branchId?: string;
}
