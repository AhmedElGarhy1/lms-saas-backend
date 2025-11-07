/**
 * Type Maps for Commands and Events
 *
 * Separates command and event types for better type safety and clarity.
 * Commands are used only for complex cross-domain coordination (orchestrators).
 * Simple CRUD operations emit events directly after performing work.
 *
 * Uses enum values for type safety - ensures all keys match the enum definitions.
 */

import {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserRestoredEvent,
  UserActivatedEvent,
} from '@/modules/user/events/user.events';
import {
  UserLoggedInEvent,
  UserLoggedOutEvent,
  TokenRefreshedEvent,
  TwoFactorEnabledEvent,
  TwoFactorDisabledEvent,
  TwoFactorSetupEvent,
  PasswordChangedEvent,
} from '@/modules/auth/events/auth.events';
import {
  CreateRoleEvent,
  UpdateRoleEvent,
  DeleteRoleEvent,
  RestoreRoleEvent,
} from '@/modules/access-control/events/role.events';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
  DeleteCenterEvent,
  RestoreCenterEvent,
  AssignCenterOwnerEvent,
  CreateCenterBranchEvent,
} from '@/modules/centers/events/center.events';
import {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchDeletedEvent,
  BranchRestoredEvent,
} from '@/modules/centers/events/branch.events';
import {
  GrantCenterAccessEvent,
  GrantUserAccessEvent,
  AssignRoleEvent,
  ActivateCenterAccessEvent,
  DeactivateCenterAccessEvent,
} from '@/modules/access-control/events/access-control.events';
import { CreateAdminEvent } from '@/modules/admin/events/admin.events';
import { CreateStaffEvent } from '@/modules/staff/events/staff.events';
import {
  PasswordResetRequestedEvent,
  EmailVerificationRequestedEvent,
  OtpEvent,
} from '@/modules/auth/events/auth.events';

// Import event enums for type safety
import { UserEvents } from '@/shared/events/user.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { RoleEvents } from '@/shared/events/role.events.enum';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { BranchEvents } from '@/shared/events/branch.events.enum';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { StaffEvents } from '@/shared/events/staff.events.enum';

/**
 * Command Type Map
 * Maps command names to their command class types.
 * Commands represent intentions (what we want to do).
 *
 * Commands are used ONLY for complex cross-domain coordination via orchestrators.
 * Simple CRUD operations do NOT use commands - they emit events directly.
 *
 * Uses enum values for type safety - ensures all keys match the enum definitions.
 */
export type CommandTypeMap = Record<string, never>;

/**
 * Event Type Map
 * Maps event names to their event class types.
 * Events represent facts (what happened).
 *
 * Uses enum values for type safety - ensures all keys match the enum definitions.
 */
export type EventTypeMap = {
  // User Events (Phase 2 - Completed)
  [UserEvents.CREATED]: UserCreatedEvent;
  [UserEvents.UPDATED]: UserUpdatedEvent;
  [UserEvents.DELETED]: UserDeletedEvent;
  [UserEvents.RESTORED]: UserRestoredEvent;
  [UserEvents.ACTIVATED]: UserActivatedEvent;

  // Auth Events (Phase 2 - Completed)
  [AuthEvents.USER_LOGGED_IN]: UserLoggedInEvent;
  [AuthEvents.USER_LOGGED_OUT]: UserLoggedOutEvent;
  [AuthEvents.TOKEN_REFRESHED]: TokenRefreshedEvent;
  [AuthEvents.PASSWORD_CHANGED]: PasswordChangedEvent;
  [AuthEvents.TWO_FA_SETUP]: TwoFactorSetupEvent;
  [AuthEvents.TWO_FA_ENABLED]: TwoFactorEnabledEvent;
  [AuthEvents.TWO_FA_DISABLED]: TwoFactorDisabledEvent;

  // Role Events (Phase 2 - Completed)
  [RoleEvents.CREATED]: CreateRoleEvent;
  [RoleEvents.UPDATED]: UpdateRoleEvent;
  [RoleEvents.DELETED]: DeleteRoleEvent;
  [RoleEvents.RESTORED]: RestoreRoleEvent;

  // Center Events (Phase 2 - Completed)
  [CenterEvents.CREATED]: CreateCenterEvent;
  [CenterEvents.UPDATED]: UpdateCenterEvent;
  [CenterEvents.DELETED]: DeleteCenterEvent;
  [CenterEvents.RESTORED]: RestoreCenterEvent;
  [CenterEvents.ASSIGN_OWNER]: AssignCenterOwnerEvent;
  [CenterEvents.CREATE_BRANCH]: CreateCenterBranchEvent;

  // Branch Events
  [BranchEvents.CREATED]: BranchCreatedEvent;
  [BranchEvents.UPDATED]: BranchUpdatedEvent;
  [BranchEvents.DELETED]: BranchDeletedEvent;
  [BranchEvents.RESTORED]: BranchRestoredEvent;

  // AccessControl Events
  [AccessControlEvents.GRANT_CENTER_ACCESS]: GrantCenterAccessEvent;
  [AccessControlEvents.GRANT_USER_ACCESS]: GrantUserAccessEvent;
  [AccessControlEvents.ASSIGN_ROLE]: AssignRoleEvent;
  [AccessControlEvents.ACTIVATE_CENTER_ACCESS]: ActivateCenterAccessEvent;
  [AccessControlEvents.DEACTIVATE_CENTER_ACCESS]: DeactivateCenterAccessEvent;

  // Admin Events
  [AdminEvents.CREATE]: CreateAdminEvent;

  // Staff Events
  [StaffEvents.CREATE]: CreateStaffEvent;

  // Additional Auth Events
  [AuthEvents.PASSWORD_RESET_REQUESTED]: PasswordResetRequestedEvent;
  [AuthEvents.EMAIL_VERIFICATION_REQUESTED]: EmailVerificationRequestedEvent;
  [AuthEvents.OTP]: OtpEvent;
};

/**
 * Combined type map for backward compatibility.
 * TypeSafeEventEmitter can use this for unified command/event handling.
 */
export type UnifiedTypeMap = CommandTypeMap & EventTypeMap;

/**
 * Helper type to extract command name from CommandTypeMap
 */
export type CommandName = keyof CommandTypeMap;

/**
 * Helper type to extract command payload type for a given command name
 */
export type CommandPayload<T extends CommandName> = CommandTypeMap[T];

/**
 * Helper type to extract event name from EventTypeMap
 */
export type EventName = keyof EventTypeMap;

/**
 * Helper type to extract payload type for a given event name
 */
export type EventPayload<T extends EventName> = EventTypeMap[T];

/**
 * Unified type for backward compatibility with existing code
 */
export type EventOrCommandName = keyof UnifiedTypeMap;

/**
 * Unified payload type for backward compatibility
 */
export type EventOrCommandPayload<T extends EventOrCommandName> =
  UnifiedTypeMap[T];
