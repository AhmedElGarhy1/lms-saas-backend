import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { Level } from '../entities/level.entity';

export class DeletedLevelIdParamDto {
  @ApiProperty({
    description: 'Level ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @BelongsToCenter(Level, true)
  levelId: string;
}