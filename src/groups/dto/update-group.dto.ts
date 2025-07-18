import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateGroupDto {
  @ApiProperty({ example: 'Class 6A', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Primary 6 Section A', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'grade-uuid', required: false })
  @IsOptional()
  @IsString()
  gradeLevelId?: string;

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @IsInt()
  maxStudents?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
