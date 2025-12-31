import { IsBoolean, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StudentPaymentStrategyDto {
  @ApiProperty({
    description: 'Allow package purchases for this class',
    example: true,
    default: true,
  })
  @IsBoolean()
  includePackage: boolean;

  @ApiProperty({
    description: 'Allow per-session payments',
    example: true,
    default: true,
  })
  @IsBoolean()
  includeSession: boolean;

  @ApiProperty({
    description: 'Price per session (required when includeSession is true)',
    example: 5000,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sessionPrice?: number;

  @ApiProperty({
    description: 'Allow monthly subscriptions',
    example: false,
    default: false,
  })
  @IsBoolean()
  includeMonth: boolean;

  @ApiProperty({
    description:
      'Monthly subscription price (required when includeMonth is true)',
    example: 15000,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthPrice?: number;
}
