# Export Functionality Documentation

## Overview

The export functionality provides a standardized way to export data from all modules in CSV, XLSX, and JSON formats. It uses the same pagination and filtering logic as the regular endpoints, ensuring consistency.

## Architecture

### Core Components

1. **ExportService** - Main service handling export logic
2. **ExportMapper** - Interface for mapping entities to export format
3. **BaseExportController** - Abstract base controller for export endpoints
4. **Entity-specific Mappers** - Mappers for each entity type

### Export Formats

- **CSV** - Comma-separated values
- **XLSX** - Excel format
- **JSON** - JavaScript Object Notation

## Usage

### Basic Export Endpoint

All modules with export functionality expose a `/export` endpoint:

```typescript
GET /users/export?format=csv&filename=users&page=1&limit=100
GET /centers/export?format=xlsx&filename=centers
GET /activity-logs/export?format=json&filename=logs
```

### Query Parameters

- `format` - Export format (csv, xlsx, json) - defaults to csv
- `filename` - Custom filename (without extension) - defaults to entity name
- All pagination and filtering parameters from the main endpoint

### Example Requests

```bash
# Export users as CSV
GET /users/export?format=csv&search=john&isActive=true

# Export centers as Excel
GET /centers/export?format=xlsx&filename=my-centers&isActive=true

# Export activity logs as JSON
GET /activity-logs/export?format=json&type=USER_LOGIN&startDate=2024-01-01
```

## Implementation Guide

### 1. Create an Export Mapper

```typescript
import { ExportMapper } from '@/shared/common/services/export.service';
import { YourEntity } from '../entities/your-entity.entity';

export interface YourEntityExportData {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export class YourEntityExportMapper
  implements ExportMapper<YourEntity, YourEntityExportData>
{
  mapToExport(entity: YourEntity): YourEntityExportData {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      createdAt: entity.createdAt?.toISOString() || '',
    };
  }

  getHeaders(): string[] {
    return ['ID', 'Name', 'Email', 'Created At'];
  }
}
```

### 2. Create Export DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ExportQueryDto } from '@/shared/common/dto/export-query.dto';

export class ExportYourEntitiesDto extends ExportQueryDto {
  @ApiProperty({
    description: 'Filter by active status',
    required: false,
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Filter by category',
    required: false,
    example: 'CATEGORY_A',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
```

### 3. Add Export to Controller

```typescript
import { ExportService } from '@/shared/common/services/export.service';
import { YourEntityExportMapper } from './mappers/your-entity-export.mapper';
import { ExportYourEntitiesDto } from './dto/export-your-entities.dto';
import { ExportResponseDto } from '@/shared/common/dto/export-response.dto';

@Controller('your-entities')
export class YourEntityController {
  constructor(
    private readonly yourEntityService: YourEntityService,
    private readonly exportService: ExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export your entities data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    type: ExportResponseDto,
  })
  @Permissions(PERMISSIONS.YOUR_ENTITY.READ)
  async exportYourEntities(
    @Query() query: ExportYourEntitiesDto,
    @Res() res: Response,
    @GetUser() actor: ActorUser,
  ): Promise<ExportResponseDto> {
    try {
      const format = query.format || 'csv';

      if (!this.exportService.isValidFormat(format)) {
        throw new Error(
          'Invalid export format. Supported formats: csv, xlsx, json',
        );
      }

      // Get data using the same pagination logic
      const paginationResult =
        await this.yourEntityService.paginateYourEntities(query, actor);
      const entities = paginationResult.items;

      // Create mapper
      const mapper = new YourEntityExportMapper();

      // Generate base filename
      const baseFilename = query.filename || 'your-entities';

      // Use the simplified export method
      return await this.exportService.exportData(
        entities,
        mapper,
        format,
        baseFilename,
        res,
      );
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }
}
```

### 4. Using BaseExportController (Alternative)

```typescript
import {
  BaseExportController,
  ExportQueryDto,
} from '@/shared/common/controllers/base-export.controller';

@Controller('your-entities')
export class YourEntityController extends BaseExportController<YourEntity> {
  constructor(
    private readonly yourEntityService: YourEntityService,
    exportService: ExportService,
  ) {
    super(exportService);
  }

  protected async getDataForExport(
    query: ExportQueryDto,
  ): Promise<YourEntity[]> {
    const result = await this.yourEntityService.paginateYourEntities(query);
    return result.items;
  }

  protected getExportMapper() {
    return new YourEntityExportMapper();
  }

  protected getExportHeaders(): string[] {
    return ['ID', 'Name', 'Email', 'Created At'];
  }

  protected getDefaultFilename(): string {
    return 'your-entities';
  }
}
```

## Available Mappers

### UserExportMapper

- Maps User entities to export format
- Includes profile information
- Headers: ID, Email, Name, Phone, Is Active, Email Verified, Created At, Updated At, Profile Type, Profile Name

### CenterExportMapper

- Maps Center entities to export format
- Includes owner information
- Headers: ID, Name, Address, Phone, Email, Website, Is Active, Created At, Updated At, Owner Name, Owner Email

### RoleExportMapper

- Maps Role entities to export format
- Includes center and user count information
- Headers: ID, Name, Type, Description, Is Active, Read Only, Created At, Updated At, Center ID, Center Name, User Count

### ActivityLogExportMapper

- Maps ActivityLog entities to export format
- Includes actor and center information
- Headers: ID, Type, Actor ID, Actor Email, Center ID, Center Name, IP Address, User Agent, Created At, Metadata

## Simplified Export Service

### New `exportData` Method

The `ExportService` now provides a simplified `exportData` method that handles all the common logic:

```typescript
async exportData<T, R extends Record<string, any>>(
  data: T[],
  mapper: ExportMapper<T, R>,
  format: string,
  filename: string,
  res: Response,
): Promise<ExportResponseDto>
```

### Benefits of the Simplified Approach

- **Eliminates Code Duplication**: No more repeated switch statements across controllers
- **Centralized Logic**: All validation, error handling, and format selection in one place
- **Consistent Behavior**: Same validation and error messages across all export endpoints
- **Easier Maintenance**: Changes to export logic only need to be made in one place
- **Reduced Controller Complexity**: Controllers focus on data retrieval, not export logic

### Before vs After

**Before (Duplicated Logic):**

```typescript
// Repeated in every controller
if (!this.exportService.isValidFormat(format)) {
  throw new Error('Invalid export format...');
}

if (!data || data.length === 0) {
  throw new Error('No data available for export');
}

const filename = this.exportService.generateFilename(baseFilename, format);

switch (format) {
  case 'csv':
    return await this.exportService.exportToCsv(data, mapper, filename, res);
  case 'xlsx':
    return await this.exportService.exportToXlsx(data, mapper, filename, res);
  case 'json':
    return await this.exportService.exportToJson(data, mapper, filename, res);
  default:
    throw new Error(`Unsupported format: ${format}`);
}
```

**After (Simplified):**

```typescript
// Single line in every controller
return await this.exportService.exportData(
  data,
  mapper,
  format,
  baseFilename,
  res,
);
```

## DTO-Based Approach Benefits

### Type Safety

- **Strong Typing**: Export DTOs provide compile-time type checking
- **Validation**: Automatic validation using class-validator decorators
- **IntelliSense**: Better IDE support with autocomplete and error detection

### API Documentation

- **Swagger Integration**: Automatic OpenAPI documentation generation
- **Clear Parameters**: Well-documented query parameters with examples
- **Response Types**: Structured response DTOs with proper typing

### Maintainability

- **Reusable Base**: `ExportQueryDto` extends `BasePaginationDto` for consistency
- **Modular Design**: Entity-specific DTOs extend the base export DTO
- **Validation Rules**: Centralized validation logic in DTOs

### Example DTO Structure

```typescript
// Base export DTO with common pagination and export options
export class ExportQueryDto extends BasePaginationDto {
  format?: ExportFormat = ExportFormat.CSV;
  filename?: string;
}

// Entity-specific DTO with additional filters
export class ExportUsersDto extends ExportQueryDto {
  isActive?: boolean;
  profileType?: string;
  twoFactorEnabled?: boolean;
  phoneVerified?: boolean;
  centerId?: string;
}
```

## Best Practices

### 1. Consistent Naming

- Use descriptive filenames
- Include timestamps in generated filenames
- Use kebab-case for entity names

### 2. Error Handling

- Always validate export format
- Check for empty data
- Provide meaningful error messages

### 3. Performance

- Use pagination for large datasets
- Consider memory usage for large exports
- Implement proper error handling

### 4. Security

- Apply proper permissions
- Validate user access to data
- Sanitize filenames

### 5. Data Mapping

- Only include necessary fields
- Format dates consistently
- Handle null/undefined values
- Escape special characters in CSV

## File Naming Convention

Generated filenames follow this pattern:

```
{entity-name}_{timestamp}.{format}
```

Examples:

- `users_2024-01-15T10-30-45-123Z.csv`
- `centers_2024-01-15T10-30-45-123Z.xlsx`
- `activity-logs_2024-01-15T10-30-45-123Z.json`

## Response Headers

Export endpoints set appropriate headers:

- `Content-Type` - MIME type for the format
- `Content-Disposition` - Attachment with filename
- `Cache-Control` - No caching for dynamic exports

## Error Responses

Common error scenarios:

- **400 Bad Request** - Invalid export format
- **204 No Content** - No data available for export
- **403 Forbidden** - Insufficient permissions
- **500 Internal Server Error** - Export processing failed

## Testing

### Unit Tests

```typescript
describe('ExportService', () => {
  it('should export data to CSV format', async () => {
    // Test CSV export
  });

  it('should validate export format', () => {
    // Test format validation
  });
});
```

### Integration Tests

```typescript
describe('UserController Export', () => {
  it('should export users as CSV', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/export?format=csv')
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
  });
});
```

## Future Enhancements

1. **Async Export** - For very large datasets
2. **Export Templates** - Customizable export formats
3. **Scheduled Exports** - Automated export generation
4. **Export History** - Track export requests
5. **Compression** - ZIP files for multiple formats
6. **Email Delivery** - Send exports via email
