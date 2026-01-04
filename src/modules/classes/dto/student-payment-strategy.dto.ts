import {
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Validate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StudentPaymentStrategyDto {
  @ApiProperty({
    description: 'Allow per-session payments',
    example: true,
    default: true,
  })
  @IsBoolean()
  @Validate(
    (object: StudentPaymentStrategyDto) => {
      // Check if at least one payment option is enabled
      return (
        object.includeSession || object.includeMonth || object.includeClass
      );
    },
    {
      message:
        'At least one payment option must be enabled: includeSession, includeMonth, or includeClass',
    },
  )
  includeSession: boolean;

  @ApiProperty({
    description: 'Price per session (required when includeSession is true)',
    example: 5000,
    minimum: 0,
    required: false,
  })
  @Validate(
    (object: StudentPaymentStrategyDto) => {
      if (
        object.includeSession &&
        (object.sessionPrice === undefined || object.sessionPrice === null)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'sessionPrice is required when includeSession is true',
    },
  )
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
  @Validate(
    (object: StudentPaymentStrategyDto) => {
      if (
        object.includeMonth &&
        (object.monthPrice === undefined || object.monthPrice === null)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'monthPrice is required when includeMonth is true',
    },
  )
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthPrice?: number;

  @ApiProperty({
    description: 'Allow one-time class charges',
    example: false,
    default: false,
  })
  @IsBoolean()
  includeClass: boolean;

  @ApiProperty({
    description:
      'One-time class charge price (required when includeClass is true)',
    example: 1500,
    minimum: 0,
    required: false,
  })
  @Validate(
    (object: StudentPaymentStrategyDto) => {
      if (
        object.includeClass &&
        (object.classPrice === undefined || object.classPrice === null)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'classPrice is required when includeClass is true',
    },
  )
  @IsOptional()
  @IsNumber()
  @Min(0)
  classPrice?: number;
}
