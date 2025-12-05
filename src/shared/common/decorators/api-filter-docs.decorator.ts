import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

export interface FilterDocsOptions {
  dto: Type<any>;
  prefix?: string;
}

export function ApiFilterDocs(options: FilterDocsOptions) {
  const { dto, prefix = 'filter' } = options;

  // Get the DTO instance to extract field information
  const dtoInstance = new dto();
  const fieldMapping = (dto as any).FIELD_MAPPING || {};

  // Generate ApiQuery decorators for each filter field
  const decorators = Object.keys(fieldMapping).map((fieldName) => {
    const fieldType = Reflect.getMetadata(
      'design:type',
      dtoInstance,
      fieldName,
    );
    // Optional metadata available but not currently used
    // const isOptional = Reflect.getMetadata(
    //   'nestjs:optional',
    //   dtoInstance,
    //   fieldName,
    // );

    return ApiQuery({
      name: `${prefix}[${fieldName}]`,
      required: false,
      type: fieldType || String,
      description: `Filter by ${fieldName}`,
    });
  });

  // Add standard pagination parameters
  const standardParams = [
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (1-based)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of items per page',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: 'Search term',
    }),
  ];

  return applyDecorators(...standardParams, ...decorators);
}
