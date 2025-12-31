import { randomBytes } from 'crypto';

/**
 * Generate a correlation ID for tracking related operations across services
 */
export function generateCorrelationId(): string {
  return `corr_${randomBytes(16).toString('hex')}`;
}
