import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLevelDto {
  @ApiProperty({
    description: 'Name of the level',
    example: 'Primary 1',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;
}
