import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Permission action (e.g., user:view, center:manage)',
    example: 'user:view',
  })
  @IsString()
  action: string;
}
