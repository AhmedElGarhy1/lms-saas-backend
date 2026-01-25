import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { Subject } from '../entities/subject.entity';

export class DeletedSubjectIdParamDto {
  @ApiProperty({
    description: 'Subject ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @BelongsToCenter(Subject, true)
  subjectId: string;
}
