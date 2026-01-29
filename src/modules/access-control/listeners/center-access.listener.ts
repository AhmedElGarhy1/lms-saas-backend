import { Injectable } from '@nestjs/common';

/**
 * Center access domain listeners.
 * Grant/revoke are performed by AccessControlService; it emits events after success.
 * Notification (and other) handlers subscribe to those events. This listener no longer
 * performs grant/revoke to avoid double execution (e.g. API -> service revoke + emit -> handler
 * calling service again -> centerAccessNotFound).
 */
@Injectable()
export class CenterAccessListener {}
