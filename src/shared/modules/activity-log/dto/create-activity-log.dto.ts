import { ActivityType } from '../entities/activity-log.entity';

export interface CreateActivityLogDto {
  type: ActivityType;
  description: string;
  metadata?: Record<string, any>;
  actorId?: string;
  centerId?: string;
  ipAddress?: string;
  userAgent?: string;
}
