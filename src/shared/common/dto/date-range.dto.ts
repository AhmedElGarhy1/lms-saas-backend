import {
  IsOptional,
  Validate,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsoUtcDate } from '../decorators/is-iso-datetime.decorator';

/**
 * Custom validator to ensure dateTo is greater than dateFrom
 * Only validates if both dateFrom and dateTo are present
 */
function IsDateRangeValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateRangeValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as DateRangeDto;
          // Only validate if both dates are present
          if (!obj.dateFrom || !obj.dateTo) {
            return true; // Let @IsoUtcDate handle required validation
          }

          // Compare Date objects - dateTo must be greater than dateFrom
          return obj.dateTo.getTime() > obj.dateFrom.getTime();
        },
        defaultMessage(args: ValidationArguments) {
          return '"dateTo" must be greater than "dateFrom"';
        },
      },
    });
  };
}

export class DateRangeDto {
  @ApiPropertyOptional({
    description:
      'Filter from date (ISO 8601 format with timezone, e.g., 2024-01-01T00:00:00+02:00)',
    type: Date,
  })
  @IsOptional()
  @IsoUtcDate()
  dateFrom?: Date;

  @ApiPropertyOptional({
    description:
      'Filter to date (ISO 8601 format with timezone, e.g., 2024-01-31T23:59:59+02:00)',
    type: Date,
  })
  @IsOptional()
  @IsoUtcDate()
  @Validate(IsDateRangeValid, {
    message: '"dateTo" must be greater than "dateFrom"',
  })
  dateTo?: Date;
}
