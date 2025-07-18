import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubjectDto {
  @ApiProperty({ example: 'Mathematics', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Advanced mathematics for primary students',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'grade-uuid', required: false })
  @IsOptional()
  @IsString()
  gradeLevelId?: string;

  @ApiProperty({ example: 4, required: false })
  @IsOptional()
  @IsInt()
  credits?: number;

  @ApiProperty({ example: 60, required: false })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
