/**
 * Utility functions for validating recipient formats
 * Ensures email and phone numbers are in correct format before sending notifications
 */

/**
 * Basic email validation (RFC 5322 simplified)
 * Checks for basic email format: local@domain
 * @param email - Email address to validate
 * @returns true if email format is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email regex (simplified RFC 5322)
  // Allows: local@domain format
  // More permissive than strict RFC 5322 but catches most invalid formats
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email.trim());
}

/**
 * E.164 phone number validation
 * E.164 format: +[country code][number] (max 15 digits total)
 * @param phone - Phone number to validate
 * @returns true if phone is in E.164 format, false otherwise
 */
export function isValidE164(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // E.164 format: + followed by 1-15 digits
  // Example: +1234567890, +441234567890
  const e164Regex = /^\+[1-9]\d{1,14}$/;

  return e164Regex.test(phone.trim());
}

/**
 * Normalize phone number to E.164 format
 * Attempts to convert various phone formats to E.164
 * @param phone - Phone number to normalize
 * @returns Normalized E.164 phone number or null if cannot be normalized
 */
export function normalizePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all whitespace, dashes, parentheses
  let normalized = phone.replace(/[\s\-\(\)]/g, '');

  // If already in E.164 format, return as-is
  if (isValidE164(normalized)) {
    return normalized;
  }

  // If starts with 00, replace with +
  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.substring(2);
    if (isValidE164(normalized)) {
      return normalized;
    }
  }

  // If starts with 0 (local format), might need country code
  // For now, return null - caller should provide country code
  if (normalized.startsWith('0')) {
    return null;
  }

  // If no + prefix, try adding default country code (US: +1)
  // This is a fallback - ideally phone should already have country code
  if (!normalized.startsWith('+')) {
    // Assume US number if 10 digits
    if (/^\d{10}$/.test(normalized)) {
      normalized = '+1' + normalized;
      if (isValidE164(normalized)) {
        return normalized;
      }
    }
  }

  return null;
}

/**
 * Validate recipient based on channel requirements
 * @param recipient - Recipient address (email or phone)
 * @param channel - Notification channel
 * @returns true if recipient is valid for channel, false otherwise
 */
export function isValidRecipientForChannel(
  recipient: string,
  channel: string,
): boolean {
  if (!recipient || typeof recipient !== 'string') {
    return false;
  }

  // EMAIL channel requires valid email
  if (channel === 'EMAIL' || channel === 'email') {
    return isValidEmail(recipient);
  }

  // SMS and WHATSAPP require valid phone (E.164)
  if (
    channel === 'SMS' ||
    channel === 'sms' ||
    channel === 'WHATSAPP' ||
    channel === 'whatsapp'
  ) {
    return isValidE164(recipient);
  }

  // IN_APP and PUSH don't require specific format validation
  // (they use userId, not recipient address)
  return true;
}
