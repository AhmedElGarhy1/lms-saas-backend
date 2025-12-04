import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddStudentsToGroupDto {
  @ApiProperty({
    description: 'Student user profile IDs to add to the group',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsArray()
  @IsUUID(4, { each: true })
  studentUserProfileIds: string[];
}
