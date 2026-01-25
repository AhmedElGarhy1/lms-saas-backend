import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { Class } from '../entities/class.entity';

export class DeletedClassIdParamDto {
  @ApiProperty({
    description: 'Class ID',
    example: 'uuid',
  })
  @IsUUID()
  @BelongsToBranch(Class, true)
  classId: string;
}
