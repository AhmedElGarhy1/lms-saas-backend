import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({
    description: 'Name of the subject',
    example: 'Math',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;
}
