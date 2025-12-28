import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { Branch } from '@/modules/centers/entities/branch.entity';

export class BranchIdParamDto {
  @ApiProperty({
    description: 'Branch ID',
    example: 'uuid',
  })
  @IsUUID()
  @BelongsToCenter(Branch)
  branchId: string;
}
