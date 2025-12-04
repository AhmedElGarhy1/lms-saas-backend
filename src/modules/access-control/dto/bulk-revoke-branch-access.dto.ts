import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Branch } from '@/modules/centers/entities/branch.entity';

export class BulkRevokeBranchAccessDto {
  @ApiProperty({
    description: 'Branch ID to revoke access from',
    example: 'uuid-branch-id',
  })
  @IsUUID()
  @Exists(Branch)
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
  userProfileIds: string[];
}
