import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignGroupDto {
  @ApiProperty({
    example: 'group-uuid',
    description: 'ID of the group to assign',
  })
  @IsString()
  groupId: string;
}
