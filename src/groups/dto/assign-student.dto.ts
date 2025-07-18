import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignStudentDto {
  @ApiProperty({
    example: 'student-uuid',
    description: 'ID of the student to assign',
  })
  @IsString()
  studentId: string;
}
