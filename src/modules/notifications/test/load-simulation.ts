import { RecipientInfo } from '../types/recipient-info.interface';
import { faker } from '@faker-js/faker';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export interface LoadSimulationOptions {
  recipientCount: number;
  includeErrors?: boolean;
  errorRate?: number; // 0-1
  localeDistribution?: {
    en?: number; // 0-1
    ar?: number; // 0-1
  };
}

/**
 * Generate fake recipients for load testing
 */
export function generateFakeRecipients(
  count: number,
  options?: {
    includeErrors?: boolean;
    errorRate?: number;
    localeDistribution?: { en?: number; ar?: number };
  },
): RecipientInfo[] {
  const recipients: RecipientInfo[] = [];

  for (let i = 0; i < count; i++) {
    const shouldError =
      options?.includeErrors && Math.random() < (options.errorRate || 0.1);

    // Determine locale based on distribution
    let locale = 'en';
    if (options?.localeDistribution) {
      const rand = Math.random();
      if (
        options.localeDistribution.ar &&
        rand < options.localeDistribution.ar
      ) {
        locale = 'ar';
      } else if (
        options.localeDistribution.en &&
        rand < options.localeDistribution.en
      ) {
        locale = 'en';
      }
    } else {
      locale = i % 2 === 0 ? 'en' : 'ar';
    }

    recipients.push({
      userId: `user-${i}`,
      email:
        shouldError && Math.random() < 0.5
          ? 'invalid-email'
          : faker.internet.email(),
      phone:
        shouldError && Math.random() < 0.5
          ? 'invalid-phone'
          : faker.phone.number(),
      locale,
      centerId: `center-${i % 10}`,
      profileType:
        i % 3 === 0
          ? ProfileType.ADMIN
          : i % 3 === 1
            ? ProfileType.STAFF
            : ProfileType.TEACHER,
      profileId: `profile-${i}`,
    });
  }

  return recipients;
}

/**
 * Simulate load by generating recipients and calling trigger function
 */
export async function simulateLoad(
  triggerFn: (recipients: RecipientInfo[]) => Promise<any>,
  options: LoadSimulationOptions,
): Promise<{ duration: number; result: any }> {
  const recipients = generateFakeRecipients(options.recipientCount, {
    includeErrors: options.includeErrors,
    errorRate: options.errorRate,
    localeDistribution: options.localeDistribution,
  });

  const startTime = Date.now();
  const result = await triggerFn(recipients);
  const duration = Date.now() - startTime;

  return { duration, result };
}

/**
 * Measure performance metrics for batch processing
 */
export interface PerformanceMetrics {
  totalRecipients: number;
  duration: number;
  recipientsPerSecond: number;
  averageLatency: number;
  successRate: number;
}

export function calculateMetrics(
  result: { total: number; sent: number; failed: number },
  duration: number,
): PerformanceMetrics {
  return {
    totalRecipients: result.total,
    duration,
    recipientsPerSecond: result.total / (duration / 1000),
    averageLatency: duration / result.total,
    successRate: result.total > 0 ? result.sent / result.total : 0,
  };
}
