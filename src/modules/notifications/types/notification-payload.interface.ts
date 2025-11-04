import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationGroup } from '../enums/notification-group.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export interface NotificationPayload {
  recipient: string;
  channel: NotificationChannel;
  type: NotificationType;
  group: NotificationGroup;
  data: Record<string, any>;
  locale?: string;
  centerId?: string;
  userId?: string;
  profileType?: ProfileType | null;
  profileId?: string | null;
  subject?: string;
  title?: string;
  /**
   * Correlation ID for request tracing across services
   * Extracted from RequestContext or generated if not available
   */
  correlationId?: string;
}
