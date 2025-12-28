import { SetMetadata } from '@nestjs/common';

export const PARENT_ONLY_KEY = 'parentOnly';

export const ParentOnly = () => SetMetadata(PARENT_ONLY_KEY, true);
