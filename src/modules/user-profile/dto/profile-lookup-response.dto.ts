import { ApiProperty } from '@nestjs/swagger';

export class ProfileLookupResponseDto {
  @ApiProperty({
    description: 'User Profile ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userProfileId: string;

  @ApiProperty({
    description: 'Student code',
    example: 'STU-25-000001',
  })
  code: string;
}
