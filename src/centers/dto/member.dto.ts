import { ApiProperty } from '@nestjs/swagger';

export class MemberDto {
  @ApiProperty({ example: 'user-uuid', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: 'center-uuid', description: 'Center ID' })
  centerId: string;

  @ApiProperty({ example: 'Teacher', description: 'Role name' })
  role: string;

  @ApiProperty({
    example: 'admin-uuid',
    description: 'ID of the user who added this member',
  })
  createdBy: string;

  @ApiProperty({
    example: '2024-07-17T12:34:56.789Z',
    description: 'Date the member was added',
  })
  createdAt: string;

  @ApiProperty({
    description: 'User object (if populated)',
    required: false,
    example: { id: 'user-uuid', name: 'John Doe', email: 'john@example.com' },
  })
  user?: any;

  @ApiProperty({
    description: 'Role object (if populated)',
    required: false,
    example: { id: 'role-uuid', name: 'Teacher', scope: 'CENTER' },
  })
  roleObj?: any;
}
