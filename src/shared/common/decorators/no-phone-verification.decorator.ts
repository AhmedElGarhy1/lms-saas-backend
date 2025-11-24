import { SetMetadata } from '@nestjs/common';

export const NO_PHONE_VERIFICATION_KEY = 'noPhoneVerification';
export const NoPhoneVerification = () =>
  SetMetadata(NO_PHONE_VERIFICATION_KEY, true);
