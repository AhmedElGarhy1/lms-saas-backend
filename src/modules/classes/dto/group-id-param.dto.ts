import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { HasBranchAccessViaResource } from '@/shared/common/decorators/has-branch-access-via-resource.decorator';
import { Group } from '../entities/group.entity';

export class GroupIdParamDto {
  @ApiProperty({
    description: 'Group ID',
    example: 'uuid',
  })
  @IsUUID()
  @HasBranchAccessViaResource(Group)
  groupId: string;
}
