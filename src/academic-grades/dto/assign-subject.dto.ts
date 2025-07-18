import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSubjectDto {
  @ApiProperty({
    example: 'subject-uuid',
    description: 'ID of the subject to assign',
  })
  @IsString()
  subjectId: string;
}
