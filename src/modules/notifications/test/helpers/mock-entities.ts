/**
 * Mock Entity Factories
 *
 * These factories create plain objects that match entity structures.
 * We use the real entity types but create plain objects (not TypeORM entities)
 * to avoid circular dependency issues at runtime.
 *
 * The key is: we import the TYPE but not the CLASS, so TypeORM decorators
 * and circular imports don't execute. We just use the type for TypeScript.
 */

import { faker } from '@faker-js/faker';
import { NotificationStatus } from '../../enums/notification-status.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

// Import types only (not the classes with decorators)
// This avoids circular dependency while keeping type safety
import type { NotificationLog } from '../../entities/notification-log.entity';
import type { Notification } from '../../entities/notification.entity';

/**
 * Creates a mock NotificationLog for testing
 * Returns a plain object matching NotificationLog structure
 */
export function createMockNotificationLog(
  overrides?: Partial<NotificationLog>,
): Partial<NotificationLog> {
  const now = new Date();
  return {
    id: faker.string.uuid(),
    type: NotificationType.CENTER_CREATED,
    channel: NotificationChannel.EMAIL,
    status: NotificationStatus.PENDING,
    recipient: faker.internet.email(),
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a mock Notification for testing
 * Returns a plain object matching Notification structure
 */
export function createMockNotification(
  overrides?: Partial<Notification>,
): Partial<Notification> {
  const now = new Date();
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    title: faker.lorem.sentence(),
    message: faker.lorem.paragraph(),
    type: NotificationType.CENTER_CREATED,
    priority: 0,
    isArchived: false,
    channel: NotificationChannel.IN_APP,
    status: NotificationStatus.PENDING,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
