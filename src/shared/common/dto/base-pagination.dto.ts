import {
  IsOptional,
  IsNumber,
  IsString,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
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
    description: 'Apply isActive filter (false means isActive isn"t applied)',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  applyIsActive?: boolean;

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
}
