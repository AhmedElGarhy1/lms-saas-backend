import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics', description: 'Name of the subject' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Advanced mathematics for primary students',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'center-uuid', description: 'Center ID' })
  @IsString()
  centerId: string;

  @ApiProperty({
    example: 'grade-uuid',
    required: false,
    description: 'Grade level ID',
  })
  @IsOptional()
  @IsString()
  gradeLevelId?: string;

  @ApiProperty({
    example: 4,
    required: false,
    description: 'Number of credits',
  })
  @IsOptional()
  @IsInt()
  credits?: number;

  @ApiProperty({
    example: 60,
    required: false,
    description: 'Duration in minutes',
  })
  @IsOptional()
  @IsInt()
  duration?: number;
}
