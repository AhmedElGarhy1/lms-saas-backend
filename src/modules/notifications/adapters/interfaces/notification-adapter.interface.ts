import { NotificationPayload } from '../../types/notification-payload.interface';

export interface NotificationAdapter {
  send(payload: NotificationPayload): Promise<void>;
}
