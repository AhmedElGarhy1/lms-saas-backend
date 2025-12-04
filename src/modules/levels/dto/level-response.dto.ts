import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CenterResponseDto } from '@/modules/centers/dto/center-response.dto';

export class LevelResponseDto {
  @ApiProperty({ description: 'Level ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Center ID' })
  @Expose()
  centerId: string;

  @ApiProperty({ description: 'Level name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ description: 'Created by user ID' })
  @Expose()
  createdBy: string;

  @ApiProperty({ description: 'Center information', type: CenterResponseDto })
  @Expose()
  @Type(() => CenterResponseDto)
  center?: CenterResponseDto;
}
