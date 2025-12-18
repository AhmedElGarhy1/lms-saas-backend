import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '../entities/center.entity';

export class CenterIdParamDto {
  @ApiProperty({
    description: 'Center ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Center)
  id: string;
}
