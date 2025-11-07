import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { NotificationEvent } from '../types/notification-event.types';

/**
 * Type guard to check if value is an object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Extract recipient (email or phone) from event data
 * @param event - Event object containing recipient information
 * @returns Recipient email or phone, or null if not found
 */
export function extractRecipient(
  event: NotificationEvent | Record<string, unknown>,
): string | null {
  // Try various common fields
  if (
    typeof (event as Record<string, unknown>).email === 'string' &&
    (event as Record<string, unknown>).email
  ) {
    return (event as Record<string, unknown>).email as string;
  }
  const user = isObject(event) && 'user' in event ? event.user : null;
  if (isObject(user) && typeof user.email === 'string' && user.email) {
    return user.email;
  }
  const dto = isObject(event) && 'dto' in event ? event.dto : null;
  if (isObject(dto) && typeof dto.email === 'string' && dto.email) {
    return dto.email;
  }
  const userData =
    isObject(event) && 'userData' in event ? event.userData : null;
  if (
    isObject(userData) &&
    typeof userData.email === 'string' &&
    userData.email
  ) {
    return userData.email;
  }
  if (
    typeof (event as Record<string, unknown>).phone === 'string' &&
    (event as Record<string, unknown>).phone
  ) {
    return (event as Record<string, unknown>).phone as string;
  }
  if (isObject(user) && typeof user.phone === 'string' && user.phone) {
    return user.phone;
  }
  if (isObject(dto) && typeof dto.phone === 'string' && dto.phone) {
    return dto.phone;
  }
  // Auth events
  if (
    isObject(event) &&
    'resetUrl' in event &&
    typeof event.email === 'string'
  ) {
    return event.email; // Password reset event
  }
  if (
    isObject(event) &&
    'verificationUrl' in event &&
    typeof event.email === 'string'
  ) {
    return event.email; // Email verification event
  }
  return null;
}

/**
 * Extract userId from event data
 * @param event - Event object containing user information
 * @returns User ID or undefined if not found
 */
export function extractUserId(
  event: NotificationEvent | Record<string, unknown>,
): string | undefined {
  if (
    typeof (event as Record<string, unknown>).userId === 'string' &&
    (event as Record<string, unknown>).userId
  ) {
    return (event as Record<string, unknown>).userId as string;
  }
  const user = isObject(event) && 'user' in event ? event.user : null;
  if (isObject(user) && typeof user.id === 'string' && user.id) {
    return user.id;
  }
  const userProfile =
    isObject(event) && 'userProfile' in event ? event.userProfile : null;
  if (
    isObject(userProfile) &&
    typeof userProfile.id === 'string' &&
    userProfile.id
  ) {
    return userProfile.id;
  }
  const actor = isObject(event) && 'actor' in event ? event.actor : null;
  if (isObject(actor) && typeof actor.id === 'string' && actor.id) {
    return actor.id;
  }
  return undefined;
}

/**
 * Extract centerId from event data
 * @param event - Event object containing center information
 * @returns Center ID or undefined if not found
 */
export function extractCenterId(
  event: NotificationEvent | Record<string, unknown>,
): string | undefined {
  if (
    typeof (event as Record<string, unknown>).centerId === 'string' &&
    (event as Record<string, unknown>).centerId
  ) {
    return (event as Record<string, unknown>).centerId as string;
  }
  const center = isObject(event) && 'center' in event ? event.center : null;
  if (isObject(center) && typeof center.id === 'string' && center.id) {
    return center.id;
  }
  const actor = isObject(event) && 'actor' in event ? event.actor : null;
  if (isObject(actor) && typeof actor.centerId === 'string' && actor.centerId) {
    return actor.centerId;
  }
  return undefined;
}

/**
 * Extract profileType and profileId from event data
 * @param event - Event object containing profile information
 * @returns Object with profileType and profileId, or null values if not found
 */
export function extractProfileInfo(
  event: NotificationEvent | Record<string, unknown>,
): {
  profileType?: ProfileType | null;
  profileId?: string | null;
} {
  const eventObj = event as Record<string, unknown>;
  const profileType = (
    typeof eventObj.profileType !== 'undefined' ? eventObj.profileType : null
  ) as ProfileType | null;
  const userProfile =
    isObject(event) && 'userProfile' in event ? event.userProfile : null;
  const extractedProfileType =
    profileType ||
    (isObject(userProfile) && typeof userProfile.profileType !== 'undefined'
      ? userProfile.profileType
      : null) ||
    null;

  const profileId =
    (typeof eventObj.profileId === 'string' ? eventObj.profileId : null) ||
    (isObject(userProfile) && typeof userProfile.id === 'string'
      ? userProfile.id
      : null) ||
    null;

  return {
    profileType: extractedProfileType as ProfileType | null,
    profileId,
  };
}
