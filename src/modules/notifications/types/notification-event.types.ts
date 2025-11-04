import * as UserEvents from '@/modules/user/events/user.events';
import * as CenterEvents from '@/modules/centers/events/center.events';
import * as BranchEvents from '@/modules/centers/events/branch.events';
import * as AuthEvents from '@/modules/auth/events/auth.events';
import * as AccessControlEvents from '@/modules/access-control/events/access-control.events';
import * as RoleEvents from '@/modules/access-control/events/role.events';
import * as AdminEvents from '@/modules/admin/events/admin.events';
import * as StaffEvents from '@/modules/staff/events/staff.events';
import * as NotificationEvents from '@/modules/notifications/events/notification.events';

/**
 * Helper type to extract instance types from a namespace of classes
 */
type ExtractInstanceTypes<T> = {
  [K in keyof T]: T[K] extends new (...args: any[]) => infer R ? R : never;
}[keyof T];

/**
 * Union type for all possible notification event classes
 * Used for type-safe event handling in notification services
 *
 * Uses namespace imports to automatically include all event classes from each module.
 * This approach is more maintainable as new event classes are automatically included.
 */
export type NotificationEvent =
  | ExtractInstanceTypes<typeof UserEvents>
  | ExtractInstanceTypes<typeof CenterEvents>
  | ExtractInstanceTypes<typeof BranchEvents>
  | ExtractInstanceTypes<typeof AuthEvents>
  | ExtractInstanceTypes<typeof AccessControlEvents>
  | ExtractInstanceTypes<typeof RoleEvents>
  | ExtractInstanceTypes<typeof AdminEvents>
  | ExtractInstanceTypes<typeof StaffEvents>
  | ExtractInstanceTypes<typeof NotificationEvents>
  // Fallback for unknown events (maintains backward compatibility)
  | Record<string, unknown>;
