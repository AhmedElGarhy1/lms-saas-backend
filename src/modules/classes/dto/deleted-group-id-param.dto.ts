import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { Group } from '../entities/group.entity';

export class DeletedGroupIdParamDto {
  @ApiProperty({
    description: 'Group ID',
    example: 'uuid',
  })
  @IsUUID()
  @BelongsToBranch(Group, true)
  groupId: string;
}