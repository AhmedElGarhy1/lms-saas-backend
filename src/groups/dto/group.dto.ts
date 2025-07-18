import { ApiProperty } from '@nestjs/swagger';

export class GroupDto {
  @ApiProperty({ example: 'group-uuid', description: 'Group ID' })
  id: string;

  @ApiProperty({ example: 'Class 6A', description: 'Name of the group' })
  name: string;

  @ApiProperty({
    example: 'Primary 6 Section A',
    description: 'Description of the group',
  })
  description: string;

  @ApiProperty({ example: 'center-uuid', description: 'Center ID' })
  centerId: string;

  @ApiProperty({ example: 'grade-uuid', description: 'Grade level ID' })
  gradeLevelId: string;

  @ApiProperty({ example: 30, description: 'Maximum number of students' })
  maxStudents: number;

  @ApiProperty({ example: true, description: 'Whether the group is active' })
  isActive: boolean;

  @ApiProperty({
    example: '2024-07-17T12:34:56.789Z',
    description: 'Creation date',
  })
  createdAt: string;

  @ApiProperty({
    example: '2024-07-17T12:34:56.789Z',
    description: 'Last update date',
  })
  updatedAt: string;
}
