import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Class 6A', description: 'Name of the group' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Primary 6 Section A', required: false })
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
    example: 30,
    required: false,
    description: 'Maximum number of students',
  })
  @IsOptional()
  @IsInt()
  maxStudents?: number;
}
