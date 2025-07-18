import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTeacherDto {
  @ApiProperty({
    example: 'teacher-uuid',
    description: 'ID of the teacher to assign',
  })
  @IsString()
  teacherId: string;
}
