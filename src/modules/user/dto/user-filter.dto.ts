import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UserFilterDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  isActive?: boolean;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  centerId?: string;

  @IsOptional()
  @IsString()
  createdAt?: string;

  // Field mapping for database queries
  static readonly FIELD_MAPPING = {
    isActive: 'user.isActive',
    roleId: 'userRoles.roleId',
    centerId: 'centers.centerId',
    createdAt: 'user.createdAt',
  } as const;

  // Convert DTO to database filter object
  toDatabaseFilters(): Record<string, any> {
    const filters: Record<string, any> = {};

    Object.entries(this).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const dbField =
          UserFilterDto.FIELD_MAPPING[
            key as keyof typeof UserFilterDto.FIELD_MAPPING
          ];
        if (dbField) {
          filters[key] = value;
        }
      }
    });

    return filters;
  }

  // Get field mapping for this DTO
  static getFieldMapping() {
    return UserFilterDto.FIELD_MAPPING;
  }
}
