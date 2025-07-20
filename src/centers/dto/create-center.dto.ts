import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCenterDto {
  @ApiProperty({
    example: 'Springfield High',
    description: 'Name of the center',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'A public high school in Springfield',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiProperty({
    example: 'uuid-of-role',
    description:
      'Role ID for the center owner (optional, defaults to Owner role)',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  roleId?: string;
}
