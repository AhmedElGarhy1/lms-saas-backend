import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { Class } from '@/modules/classes/entities/class.entity';

export class ClassIdParamDto {
  @ApiProperty({
    description: 'Class ID',
    example: 'uuid',
  })
  @IsUUID()
  @BelongsToBranch(Class)
  classId: string;
}
