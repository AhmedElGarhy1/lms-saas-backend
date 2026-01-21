import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { Branch } from '../entities/branch.entity';

export class DeletedBranchIdParamDto {
  @ApiProperty({
    description: 'Branch ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @BelongsToCenter(Branch, true)
  branchId: string;
}