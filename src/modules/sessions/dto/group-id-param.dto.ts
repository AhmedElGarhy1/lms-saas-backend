import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GroupIdParamDto {
  @ApiProperty({ description: 'Group ID', type: String })
  @IsUUID(4)
  groupId: string;
}
