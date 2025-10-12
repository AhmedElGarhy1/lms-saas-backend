import { ActivityType } from '../entities/activity-log.entity';

export interface CreateActivityLogDto {
  type: ActivityType;
  description: string;
  metadata?: Record<string, any>;
  actorId?: string | null;
  centerId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}
