import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'Jane Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  fullName?: string;
  // Add more fields as needed
}
