import { IsDateString, Validate, IsNotEmpty, Matches } from 'class-validator';
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

          // Compare date strings directly (YYYY-MM-DD format)
          // This is safe because YYYY-MM-DD strings are lexicographically sortable
          // and avoids timezone parsing issues in validation
          if (obj.dateTo <= obj.dateFrom) {
            return false;
          }

          // Calculate days difference using timestamp comparison
          // Parse ISO date strings as UTC for relative day calculation
          // This is safe for relative comparison since both dates are parsed the same way
          // Note: Using Date constructor here is acceptable for validator context where
          // RequestContext is not available. The actual timezone conversion happens in the service layer.
          // eslint-disable-next-line no-restricted-globals
          const fromTimestamp = new Date(obj.dateFrom + 'T00:00:00Z').getTime();
          // eslint-disable-next-line no-restricted-globals
          const toTimestamp = new Date(obj.dateTo + 'T00:00:00Z').getTime();
          const diffTime = Math.abs(toTimestamp - fromTimestamp);
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
 *
 * TIMEZONE BEHAVIOR:
 * - dateFrom and dateTo are interpreted as full calendar days in the center's timezone
 * - Frontend should send date strings in YYYY-MM-DD format (e.g., "2024-01-01")
 * - Backend converts these to UTC ranges: [midnight of dateFrom in center TZ → midnight of dateTo+1 in center TZ)
 * - This ensures all sessions on the specified dates are included, regardless of server timezone
 *
 * Example:
 * - Frontend sends: dateFrom="2024-01-01", dateTo="2024-01-02"
 * - Backend converts to UTC range based on center timezone (e.g., Africa/Cairo)
 * - Result: All sessions on Jan 1 and Jan 2 in Cairo time are returned
 */
export class CalendarSessionsDto extends SessionFiltersDto {
  @ApiProperty({
    description:
      'Start date of the calendar range (YYYY-MM-DD format, interpreted as midnight in center timezone)',
    example: '2024-01-01',
  })
  @IsNotEmpty()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateFrom must be in YYYY-MM-DD format',
  })
  dateFrom!: string;

  @ApiProperty({
    description:
      'End date of the calendar range (YYYY-MM-DD format, interpreted as midnight in center timezone, inclusive)',
    example: '2024-01-31',
  })
  @IsNotEmpty()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateTo must be in YYYY-MM-DD format',
  })
  @Validate(IsDateRangeMax45Days, {
    message:
      'Date range must not exceed 45 days and "dateTo" must be after "dateFrom"',
  })
  dateTo!: string;
}
