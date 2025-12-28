import { SetMetadata } from '@nestjs/common';

export const STAFF_ONLY_KEY = 'staffOnly';

export const StaffOnly = () => SetMetadata(STAFF_ONLY_KEY, true);
