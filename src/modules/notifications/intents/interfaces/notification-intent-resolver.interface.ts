import { NotificationType } from '../../enums/notification-type.enum';
import { RecipientInfo } from '../../types/recipient-info.interface';
import { IntentForNotification } from '../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../types/audience-id.types';
import { TemplateVariablesFor } from '../../types/template-variables.types';

/**
 * Interface for notification intent resolvers
 * Resolvers handle all notification-specific logic:
 * - Fetch entities from database
 * - Resolve recipients based on audience
 * - Build template variables matching manifest.requiredVariables
 *
 * This is the SINGLE SOURCE OF TRUTH for notification logic per notification type
 */
export interface NotificationIntentResolver<T extends NotificationType> {
  /**
   * Resolve intent into template variables and recipients
   * Called once per audience (processor loops through audiences)
   *
   * @param intent - Minimal intent DTO containing only IDs
   * @param audience - Audience identifier (type-safe from manifest)
   * @returns Template variables (must match manifest.requiredVariables) and recipients
   */
  resolveIntent(
    intent: IntentForNotification<T>,
    audience: AudienceIdForNotification<T>,
  ): Promise<{
    templateVariables: TemplateVariablesFor<T>;
    recipients: RecipientInfo[];
  }>;
}
