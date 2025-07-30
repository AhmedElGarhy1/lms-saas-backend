import { SetMetadata } from '@nestjs/common';
import { ZodSchema } from 'zod';

export const ZOD_SCHEMA_KEY = 'zodSchema';

export function UseZodSchema(schema: ZodSchema<any>) {
  return SetMetadata(ZOD_SCHEMA_KEY, schema);
}
