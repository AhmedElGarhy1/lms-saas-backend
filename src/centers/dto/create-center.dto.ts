import { IsString, IsOptional, IsBoolean } from 'class-validator';
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
}
