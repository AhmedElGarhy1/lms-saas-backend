import { Validate, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsoUtcDate } from '@/shared/common/decorators/is-iso-datetime.decorator';
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
            return true; // Let @IsIsoDateTime handle required validation
          }

          // Compare Date objects
          if (obj.dateTo.getTime() <= obj.dateFrom.getTime()) {
            return false;
          }

          // Calculate days difference using timestamp comparison
          const diffTime = Math.abs(
            obj.dateTo.getTime() - obj.dateFrom.getTime(),
          );
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
 * - dateFrom and dateTo are ISO 8601 datetime strings with timezone
 * - Frontend should send ISO 8601 strings (e.g., "2024-01-01T00:00:00+02:00")
 * - Backend converts these to UTC Date objects automatically via @IsIsoDateTime()
 * - For calendar queries, dates are interpreted as full calendar days in the center's timezone
 * - Backend creates UTC ranges: [midnight of dateFrom in center TZ → midnight of dateTo+1 in center TZ)
 * - This ensures all sessions on the specified dates are included, regardless of server timezone
 *
 * Example:
 * - Frontend sends: dateFrom="2024-01-01T00:00:00+02:00", dateTo="2024-01-02T00:00:00+02:00"
 * - Backend converts to UTC Date objects automatically
 * - Result: All sessions on Jan 1 and Jan 2 in center timezone are returned
 */
export class CalendarSessionsDto extends SessionFiltersDto {
  @ApiProperty({
    description:
      'Start date of the calendar range (ISO 8601 format with timezone, e.g., 2024-01-01T00:00:00+02:00)',
    example: '2024-01-01T00:00:00+02:00',
    type: Date,
  })
  @IsNotEmpty()
  @IsoUtcDate()
  dateFrom!: Date;

  @ApiProperty({
    description:
      'End date of the calendar range (ISO 8601 format with timezone, inclusive, e.g., 2024-01-31T23:59:59+02:00)',
    example: '2024-01-31T23:59:59+02:00',
    type: Date,
  })
  @IsNotEmpty()
  @IsoUtcDate()
  @Validate(IsDateRangeMax45Days, {
    message:
      'Date range must not exceed 45 days and "dateTo" must be after "dateFrom"',
  })
  dateTo!: Date;
}
