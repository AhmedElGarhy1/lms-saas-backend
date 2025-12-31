import { SetMetadata } from '@nestjs/common';

export const NO_CONTEXT_KEY = 'noContext';

export const NoContext = () => SetMetadata(NO_CONTEXT_KEY, true);
