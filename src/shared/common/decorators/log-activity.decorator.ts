import { SetMetadata } from '@nestjs/common';
// ActivityType is now handled by domain-specific enums

export interface ActivityLogOptions {
  type: string;
  description?: string;
  metadata?: Record<string, any>;
  targetUserId?: string;
  centerId?: string;
}

export const LOG_ACTIVITY_KEY = 'logActivity';

/**
 * Decorator to mark methods that should log activities
 * Usage: @LogActivity({ type: ActivityType.USER_CREATED, description: 'User created successfully' })
 */
export const LogActivity = (options: ActivityLogOptions) =>
  SetMetadata(LOG_ACTIVITY_KEY, options);
