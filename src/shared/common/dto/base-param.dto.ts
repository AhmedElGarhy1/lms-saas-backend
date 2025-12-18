import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Base param DTO for simple UUID ID parameters
 */
export class BaseIdParamDto {
  @ApiProperty({
    description: 'Resource ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  id: string;
}
