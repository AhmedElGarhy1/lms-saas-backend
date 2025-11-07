/**
 * Branded types for better type safety and preventing ID mixing
 */

export type NotificationId = string & { readonly __brand: 'NotificationId' };
export type JobId = string & { readonly __brand: 'JobId' };
export type CorrelationId = string & { readonly __brand: 'CorrelationId' };
export type UserId = string & { readonly __brand: 'UserId' };

/**
 * Helper functions to create branded types
 */
export function createNotificationId(id: string): NotificationId {
  return id as NotificationId;
}

export function createJobId(id: string): JobId {
  return id as JobId;
}

export function createCorrelationId(id: string): CorrelationId {
  return id as CorrelationId;
}

export function createUserId(id: string): UserId {
  return id as UserId;
}
