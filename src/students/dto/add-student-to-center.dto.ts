import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AddStudentToCenterDto {
  @ApiPropertyOptional({
    description: 'ID of the user who is adding the student',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the student-center relationship',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
