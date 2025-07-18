import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCenterDto {
  @ApiProperty({ example: 'Springfield High', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'A public high school in Springfield',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
