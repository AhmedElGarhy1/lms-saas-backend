export enum NotificationEvents {
  CREATED = 'notification.created',
  DELIVERED = 'notification.delivered',
  FAILED = 'notification.failed',
  READ = 'notification.read',
  PUSH_TOKEN_INVALID = 'push.token.invalid', // New event for invalid push tokens
}
