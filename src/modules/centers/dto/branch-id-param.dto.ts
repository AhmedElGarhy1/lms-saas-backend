import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { HasBranchAccess } from '@/shared/common/decorators/has-branch-access.decorator';
import { Branch } from '../entities/branch.entity';

export class BranchIdParamDto {
  @ApiProperty({
    description: 'Branch ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @BelongsToCenter(Branch)
  @HasBranchAccess()
  branchId: string;
}
