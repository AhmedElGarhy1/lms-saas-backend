import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { Group } from '@/modules/classes/entities/group.entity';

export class StartSessionDto {
  @ApiProperty({
    description: 'Group ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @BelongsToBranch(Group)
  groupId: string;
}
