import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToCenter } from '@/shared/common/decorators';
import { Class } from '@/modules/classes/entities/class.entity';

export class ClassIdParamDto {
  @ApiProperty({
    description: 'Class ID',
    example: 'uuid',
  })
  @IsUUID()
  @BelongsToCenter(Class)
  classId: string;
}
