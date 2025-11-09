import { RecipientInfo } from '../../types/recipient-info.interface';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

/**
 * Sample recipient data for testing
 */
export const testRecipients = {
  /**
   * Valid recipient with all fields
   */
  complete: {
    userId: 'user-123',
    profileId: 'profile-123',
    email: 'test@example.com',
    phone: '+1234567890',
    locale: 'en',
    centerId: 'center-123',
    profileType: ProfileType.ADMIN,
  } as RecipientInfo,

  /**
   * Recipient with only email (no phone)
   */
  emailOnly: {
    userId: 'user-456',
    profileId: 'profile-456',
    email: 'emailonly@example.com',
    phone: '', // Empty phone
    locale: 'en',
    centerId: 'center-123',
    profileType: ProfileType.STAFF,
  } as RecipientInfo,

  /**
   * Recipient with only phone (no email)
   */
  phoneOnly: {
    userId: 'user-789',
    profileId: 'profile-789',
    email: null,
    phone: '+1987654321',
    locale: 'ar',
    centerId: 'center-456',
    profileType: ProfileType.ADMIN,
  } as RecipientInfo,

  /**
   * Recipient with minimal fields
   */
  minimal: {
    userId: 'user-minimal',
    profileId: null,
    email: null,
    phone: '+1111111111',
    locale: 'en',
    centerId: null,
    profileType: null,
  } as RecipientInfo,

  /**
   * Invalid recipient (invalid email)
   */
  invalidEmail: {
    userId: 'user-invalid',
    profileId: 'profile-invalid',
    email: 'invalid-email',
    phone: '+1234567890',
    locale: 'en',
    centerId: 'center-123',
    profileType: ProfileType.ADMIN,
  } as RecipientInfo,

  /**
   * Invalid recipient (invalid phone)
   */
  invalidPhone: {
    userId: 'user-invalid-phone',
    profileId: 'profile-invalid-phone',
    email: 'test@example.com',
    phone: 'invalid-phone',
    locale: 'en',
    centerId: 'center-123',
    profileType: ProfileType.ADMIN,
  } as RecipientInfo,
};



