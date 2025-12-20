import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { Branch } from '../entities/branch.entity';

export class BulkRestoreBranchesDto {
  @ApiProperty({
    description: 'Array of branch IDs to restore',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one branch ID is required' })
  @ArrayMaxSize(100, {
    message: 'Maximum 100 branch IDs allowed per request',
  })
  @IsUUID(4, { each: true, message: 'Each branch ID must be a valid UUID' })
  @BelongsToCenter(Branch, { each: true })
  branchIds: string[];
}
