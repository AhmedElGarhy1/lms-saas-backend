import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    maximum: 1000,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  @Max(1000, { message: 'Page cannot exceed 1000' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit cannot exceed 50' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search term for text search',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
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
    description: 'Filter from date',
    type: String,
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter to date',
    type: String,
  })
  @IsOptional()
  @IsString()
  dateTo?: string;
}
