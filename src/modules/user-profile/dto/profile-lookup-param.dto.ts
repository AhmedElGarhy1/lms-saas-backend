import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ProfileLookupParamDto {
  @ApiProperty({
    description: 'User Profile ID (UUID) or Student Code',
    example: '550e8400-e29b-41d4-a716-446655440000',
    examples: [
      '550e8400-e29b-41d4-a716-446655440000', // UUID
      'STU-25-000001', // Student Code
    ],
  })
  @IsString()
  @IsNotEmpty()
  id: string;
}
