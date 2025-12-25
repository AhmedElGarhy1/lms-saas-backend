import {
  IsOptional,
  IsNumber,
  IsString,
  Min,
  Max,
  IsBoolean,
  Validate,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
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
          const obj = args.object as BasePaginationDto;
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

export class BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    maximum: 1000,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search term for text search',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field and direction',
    example: 'createdAt:DESC',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Handle both string and array inputs
    let sortValue = value;

    // If it's an array with one element, use that element
    if (Array.isArray(value) && value.length === 1) {
      sortValue = value[0];
    }

    // Parse the sort string
    if (typeof sortValue === 'string') {
      const [field, direction] = sortValue.split(':');
      if (
        field &&
        direction &&
        ['ASC', 'DESC', 'asc', 'desc'].includes(direction)
      ) {
        return [[field, direction.toUpperCase()]];
      }
    }

    return undefined;
  })
  sortBy?: [string, 'ASC' | 'DESC'][];

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

  @ApiPropertyOptional({
    description: 'return only deleted records',
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  isDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by center active status',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Display role in case of centerId provided',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  displayDetails?: boolean;
}
