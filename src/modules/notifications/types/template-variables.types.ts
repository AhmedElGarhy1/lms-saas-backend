import { NotificationType } from '../enums/notification-type.enum';
import { NotificationRegistry } from '../manifests/registry/notification-registry';

/**
 * Extract template variables type from manifest requiredVariables
 * Converts readonly array of variable names to Record<string, unknown>
 */
type VariablesFromManifest<TManifest> = TManifest extends {
  requiredVariables: readonly (infer V)[];
}
  ? { [K in V & string]: unknown }
  : never;

/**
 * Type-safe template variables for a notification type
 * Extracted from manifest.requiredVariables at compile time
 * 
 * Note: To enforce exact matching (prevent excess properties), resolvers should use
 * the `satisfies` operator when creating templateVariables objects:
 * 
 * ```typescript
 * const templateVariables = {
 *   center: {...},
 *   // centerName: ... // ❌ This will cause a compile error if not in manifest
 * } satisfies TemplateVariablesFor<NotificationType.CENTER_UPDATED>;
 * ```
 *
 * Example:
 * - NotificationType.CENTER_UPDATED manifest has requiredVariables: ['center']
 * - TemplateVariablesFor<NotificationType.CENTER_UPDATED> = { center: unknown }
 *
 * Example:
 * - NotificationType.CENTER_CREATED manifest has requiredVariables: ['creatorName', 'centerName', 'ownerName']
 * - TemplateVariablesFor<NotificationType.CENTER_CREATED> = { creatorName: unknown; centerName: unknown; ownerName: unknown }
 */
export type TemplateVariablesFor<T extends NotificationType> =
  T extends keyof typeof NotificationRegistry
    ? VariablesFromManifest<typeof NotificationRegistry[T]>
    : never;

