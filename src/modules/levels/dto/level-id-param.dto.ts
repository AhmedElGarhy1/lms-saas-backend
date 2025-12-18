import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { Level } from '../entities/level.entity';

export class LevelIdParamDto {
  @ApiProperty({
    description: 'Level ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @BelongsToCenter(Level)
  levelId: string;
}
