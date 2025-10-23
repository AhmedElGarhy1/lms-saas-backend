import { SetMetadata } from '@nestjs/common';

export const NOP_PROFILE_KEY = 'noProfile';
export const NoProfile = () => SetMetadata(NOP_PROFILE_KEY, true);
