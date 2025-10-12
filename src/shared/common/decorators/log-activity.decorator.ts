import { SetMetadata } from '@nestjs/common';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';

export interface ActivityLogOptions {
  type: ActivityType;
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
