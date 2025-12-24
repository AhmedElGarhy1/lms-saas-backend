import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { IsoUtcDate } from '@/shared/common/decorators/is-iso-datetime.decorator';
import { Group } from '@/modules/classes/entities/group.entity';

export class CancelSessionDto {
  @ApiProperty({
    description: 'Group ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @BelongsToBranch(Group)
  groupId: string;

  @ApiProperty({
    description:
      'Scheduled start time for the session (ISO 8601 format with timezone, e.g., 2024-01-15T18:00:00+02:00)',
    example: '2024-01-15T18:00:00+02:00',
    type: Date,
  })
  @IsoUtcDate()
  scheduledStartTime: Date;
}
