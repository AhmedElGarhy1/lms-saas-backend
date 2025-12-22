import { IsDateString, Validate, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SessionFiltersDto } from './session-filters.dto';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator to ensure date range is not more than 45 days
 */
function IsDateRangeMax45Days(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateRangeMax45Days',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as CalendarSessionsDto;
          if (!obj.dateFrom || !obj.dateTo) {
            return true; // Let @IsDateString handle required validation
          }

          const fromDate = new Date(obj.dateFrom);
          const toDate = new Date(obj.dateTo);
          
          // Ensure dateTo is after dateFrom
          if (toDate <= fromDate) {
            return false;
          }

          const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          return diffDays <= 45;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Date range must not exceed 45 days and "dateTo" must be after "dateFrom"';
        },
      },
    });
  };
}

/**
 * Calendar sessions DTO
 * Extends SessionFiltersDto for shared filters and adds required date range
 */
export class CalendarSessionsDto extends SessionFiltersDto {
  @ApiProperty({
    description: 'Start date of the calendar range (ISO 8601 format, required)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({
    description: 'End date of the calendar range (ISO 8601 format, required)',
    example: '2024-01-31T23:59:59Z',
  })
  @IsNotEmpty()
  @IsDateString()
  @Validate(IsDateRangeMax45Days, {
    message: 'Date range must not exceed 45 days and "dateTo" must be after "dateFrom"',
  })
  dateTo!: string;
}

