import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { HasBranchAccessViaResource } from '@/shared/common/decorators/has-branch-access-via-resource.decorator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { HasBranchAccess } from '@/shared/common/decorators/has-branch-access.decorator';
import { Class } from '../entities/class.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';

export class PaginateGroupsDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by class ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @HasBranchAccessViaResource(Class)
  classId?: string;

  @ApiProperty({
    description: 'Filter by branch ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToCenter(Branch)
  @HasBranchAccess()
  branchId?: string;
}
