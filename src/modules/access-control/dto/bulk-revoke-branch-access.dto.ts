import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { HasBranchAccess } from '@/shared/common/decorators/has-branch-access.decorator';
import { HasCenterAccess } from '@/shared/common/decorators/has-center-access.decorator';
import { Branch } from '@/modules/centers/entities/branch.entity';

export class BulkRevokeBranchAccessDto {
  @ApiProperty({
    description: 'Branch ID to revoke access from',
    example: 'uuid-branch-id',
  })
  @IsUUID()
  @BelongsToCenter(Branch)
  @HasBranchAccess()
  branchId: string;

  @ApiProperty({
    description: 'Array of user profile IDs to revoke branch access from',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one user profile ID is required' })
  @ArrayMaxSize(100, {
    message: 'Maximum 100 user profile IDs allowed per request',
  })
  @IsUUID(4, {
    each: true,
    message: 'Each user profile ID must be a valid UUID',
  })
  @HasCenterAccess({ each: true })
  userProfileIds: string[];
}
